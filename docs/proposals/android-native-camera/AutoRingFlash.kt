/*
 * AutoRingFlash.kt — v2 (stress-hardened). Snapchat-style AUTOMATIC virtual ring flash
 * + synced screen-flash burst for the Mien Shiang face scanner. Single file, no XML.
 *
 * SETUP
 *  1) app/build.gradle (1.4.0+ required for FLASH_MODE_SCREEN / ImageCapture.ScreenFlash):
 *       def camerax = "1.4.0"
 *       implementation "androidx.camera:camera-core:$camerax"
 *       implementation "androidx.camera:camera-camera2:$camerax"
 *       implementation "androidx.camera:camera-lifecycle:$camerax"
 *       implementation "androidx.camera:camera-view:$camerax"
 *       implementation "androidx.lifecycle:lifecycle-runtime-ktx:2.8.7"
 *  2) AndroidManifest.xml:
 *       <uses-permission android:name="android.permission.CAMERA"/>
 *       <activity android:name=".ScanActivity" android:exported="true"/>
 *  3) Feed faceRectNormalized (0..1, analysis-image space) from your face detector.
 *  4) Auto-capture state machine calls takeScanFrame(callback).
 */
package com.mienshiang

import android.Manifest
import android.animation.ValueAnimator
import android.content.pm.PackageManager
import android.graphics.Canvas
import android.graphics.ImageFormat
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.content.Context
import android.os.Bundle
import android.os.SystemClock
import android.util.Size
import android.view.Gravity
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import androidx.annotation.UiThread
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.Locale
import java.util.concurrent.Executors
import kotlin.math.abs

/* ============ 1. OVERLAY — Snap-style border glow (RING) + white burst (SOLID) ============ */
class RingFlashOverlayView @JvmOverloads constructor(
    context: Context, attrs: android.util.AttributeSet? = null, defStyleAttr: Int = 0
) : android.view.View(context, attrs, defStyleAttr) {

    enum class Mode { HIDDEN, RING }

    var mode: Mode = Mode.HIDDEN
        set(value) { if (field != value) { field = value; animateToTarget() } }

    /** Light output 0..1 in RING mode (closed-loop controlled). */
    var intensity: Float = 0f
        set(value) { field = value.coerceIn(0f, 1f); invalidate() }

    /** ARGB tint = color temperature (RING only; burst is always pure white). */
    var tintColor: Int = 0xFFFFFFFF.toInt()
        set(value) { field = value; shaderKey = ""; invalidate() }

    /** Ring geometry: clear hole + feather as fraction of horizontal half-radius. */
    var holeStop: Float = 0.55f
    var featherStop: Float = 0.80f

    private var solid = false
    private var displayedAlpha = 0f
    private var animator: ValueAnimator? = null
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val solidPaint = Paint().apply { color = 0xFFFFFFFF.toInt() }
    private var shaderKey = ""
    private var cachedShader: Shader? = null

    init { importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO }

    fun setSolidFlash(on: Boolean) {
        if (solid == on) return
        solid = on
        animateToTarget(fast = on)
    }

    private fun targetAlpha() = when {
        solid -> 1f
        mode == Mode.HIDDEN -> 0f
        else -> 1f
    }

    private fun animateToTarget(fast: Boolean = false) {
        animator?.cancel()
        animator = ValueAnimator.ofFloat(displayedAlpha, targetAlpha()).apply {
            duration = if (fast) 60 else 220
            addUpdateListener { displayedAlpha = it.animatedValue as Float; invalidate() }
            start()
        }
    }

    override fun onDetachedFromWindow() {
        animator?.cancel(); animator = null
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        if (displayedAlpha <= 0.01f) return
        val w = width.toFloat(); val h = height.toFloat()
        if (w <= 0f || h <= 0f) return

        if (solid) {                                   // capture burst: max-lumen white
            solidPaint.alpha = (255f * displayedAlpha).toInt()
            canvas.drawRect(0f, 0f, w, h, solidPaint)
            return
        }
        if (mode != Mode.RING) return

        val a = (intensity * 0.92f * displayedAlpha).coerceIn(0f, 1f)
        if (a <= 0.01f) return

        // Pixel-space elliptical gradient (local matrix stretch): safer across GPUs than
        // unit-space canvas scaling; cached so we don't rebuild per animation frame.
        val aQ = (a * 64).toInt()
        val key = "${w.toInt()}x${h.toInt()}|$tintColor|$aQ|$holeStop|$featherStop"
        if (key != shaderKey) {
            val cx = w / 2f; val cy = h / 2f
            val clear = withAlpha(tintColor, 0)
            val mid   = withAlpha(tintColor, (255f * a * 0.55f).toInt())
            val edge  = withAlpha(tintColor, (255f * a).toInt())
            cachedShader = RadialGradient(
                cx, cy, w / 2f,
                intArrayOf(clear, clear, mid, edge),
                floatArrayOf(0f, holeStop, featherStop, 1f),
                Shader.TileMode.CLAMP
            ).apply { setLocalMatrix(Matrix().apply { setScale(1f, h / w, cx, cy) }) }
            shaderKey = key
        }
        paint.shader = cachedShader
        canvas.drawRect(0f, 0f, w, h, paint)
        paint.shader = null
    }

    private fun withAlpha(color: Int, alpha: Int): Int =
        (color and 0x00FFFFFF) or (alpha.coerceIn(0, 255) shl 24)
}

/* ============ 2. SCREEN BRIGHTNESS — window-level, no permissions, always restore ============ */
class ScreenBrightnessController(private val window: Window) {
    private var saved: Float? = null

    @UiThread
    fun apply(level: Float) {
        val lp = window.attributes
        if (saved == null) saved = lp.screenBrightness
        val target = 0.55f + 0.45f * level.coerceIn(0f, 1f)
        if (abs(lp.screenBrightness - target) > 0.02f) {
            lp.screenBrightness = target
            window.attributes = lp
        }
    }

    @UiThread
    fun restore() {
        val s = saved ?: return
        val lp = window.attributes
        lp.screenBrightness = s
        window.attributes = lp
        saved = null
    }
}

/* ============ 3. ANALYZER — face-ROI luma + chroma warmth, normalized ROI, format-guarded ============ */
class FaceLumaAnalyzer(
    /** Face bbox in NORMALIZED (0..1) analysis-image coords; null = center oval fallback. */
    private val roiProvider: () -> RectF?,
    private val onSample: (luma: Float, warmth: Float) -> Unit
) : ImageAnalysis.Analyzer {

    private var lastMs = 0L

    override fun analyze(image: ImageProxy) {
        try {
            if (image.format != ImageFormat.YUV_420_888) return      // never guess luma
            val now = System.currentTimeMillis()
            if (now - lastMs < 100) return
            lastMs = now

            val w = image.width; val h = image.height
            val roi = (roiProvider()?.let {
                Rect((it.left * w).toInt(), (it.top * h).toInt(),
                     (it.right * w).toInt(), (it.bottom * h).toInt())
            } ?: defaultRoi(w, h)).let { clampRect(it, w, h) }

            val y = image.planes[0]
            val yBuf = y.buffer
            val rs = y.rowStride; val ps = y.pixelStride
            var sum = 0L; var n = 0
            var yy = roi.top
            while (yy < roi.bottom) {
                val row = yy * rs
                var xx = roi.left
                while (xx < roi.right) {
                    sum += yBuf.get(row + xx * ps).toInt() and 0xFF
                    n++; xx += 4
                }
                yy += 4
            }
            if (n == 0) return
            onSample((sum.toDouble() / n / 255.0).toFloat(), chromaWarmth(image, roi))
        } finally {
            image.close()
        }
    }

    /** >0 warm cast (V = R-Y), <0 cool cast (U = B-Y). */
    private fun chromaWarmth(image: ImageProxy, r: Rect): Float {
        val u = image.planes[1]; val v = image.planes[2]
        var us = 0L; var vs = 0L; var n = 0
        var yy = r.top / 2
        while (yy < r.bottom / 2) {
            var xx = r.left / 2
            while (xx < r.right / 2) {
                us += u.buffer.get(yy * u.rowStride + xx * u.pixelStride).toInt() and 0xFF
                vs += v.buffer.get(yy * v.rowStride + xx * v.pixelStride).toInt() and 0xFF
                n++; xx += 4
            }
            yy += 4
        }
        if (n == 0) return 0f
        return (((vs.toDouble() / n - 128.0) - (us.toDouble() / n - 128.0)) / 64.0)
            .coerceIn(-1.0, 1.0).toFloat()
    }

    private fun defaultRoi(w: Int, h: Int) =
        Rect((w * 0.28f).toInt(), (h * 0.18f).toInt(), (w * 0.72f).toInt(), (h * 0.82f).toInt())

    private fun clampRect(r: Rect, w: Int, h: Int) = Rect(
        r.left.coerceIn(0, w), r.top.coerceIn(0, h),
        r.right.coerceIn(0, w), r.bottom.coerceIn(0, h)
    ).takeIf { it.width() > 8 && it.height() > 8 } ?: defaultRoi(w, h)
}

/* ============ 4. CONTROLLER — auto gate + anti-windup closed loop + burst-safe lifecycle ============ */
class AutoRingFlashController(
    private val scope: CoroutineScope,
    private val overlay: RingFlashOverlayView,
    private val brightness: ScreenBrightnessController,
    private val config: Config = Config()
) : DefaultLifecycleObserver {

    data class Config(
        val engageLuma: Float = 0.34f,
        val disengageLuma: Float = 0.62f,     // > target: loop can never self-disengage
        val targetLuma: Float = 0.50f,
        val engageHoldMs: Long = 400,
        val disengageHoldMs: Long = 1500,
        val periodMs: Long = 200,
        val gain: Float = 0.9f,
        val deadband: Float = 0.03f,          // no adaptation inside target±deadband
        val slewPerStep: Float = 0.10f,       // max |Δlevel| per step (anti-pumping)
        val settleAfterEngageMs: Long = 500,  // let camera AE re-converge before adapting
        val cameraWarmupMs: Long = 600,       // ignore gate decisions right after bind
        val emaAlpha: Float = 0.35f,
        val minLevel: Float = 0.30f,
        val autoTint: Boolean = true
    )

    enum class UserMode { AUTO, ON, OFF }
    data class State(val engaged: Boolean, val level: Float, val userMode: UserMode)

    var userMode: UserMode = UserMode.AUTO

    private val _state = MutableStateFlow(State(false, 0f, UserMode.AUTO))
    val state: StateFlow<State> = _state
    val debugLuma: Float get() = smoothLuma
    val debugWarmth: Float get() = smoothWarmth

    private val sample = MutableStateFlow<Pair<Float, Float>?>(null)
    private var smoothLuma = -1f
    private var smoothWarmth = 0f
    private var level = config.minLevel
    private var engaged = false
    private var belowSince = -1L
    private var aboveSince = -1L
    private var readyAt = 0L          // gate decisions blocked until now > readyAt
    private var settleUntil = 0L      // level adaptation blocked until now > settleUntil
    private var burstInFlight = false
    private var pendingDisengage = false
    private var loop: Job? = null

    /** Thread-safe: called from the ImageAnalysis executor. */
    fun onSample(luma: Float, warmth: Float) { sample.value = luma to warmth }

    /** Call once camera is bound: blocks false-engage on dark pre-AE frames. */
    fun noteCameraBound() { readyAt = SystemClock.elapsedRealtime() + config.cameraWarmupMs }

    fun start() {
        if (loop == null) loop = scope.launch(Dispatchers.Main) {
            while (isActive) { step(); delay(config.periodMs) }
        }
    }

    @UiThread
    private fun step() {
        sample.value?.let { (l, w) ->
            smoothLuma = if (smoothLuma < 0) l else smoothLuma + config.emaAlpha * (l - smoothLuma)
            smoothWarmth += config.emaAlpha * (w - smoothWarmth)
        }
        val now = SystemClock.elapsedRealtime()

        if (now >= readyAt) when (userMode) {
            UserMode.OFF -> disengage()
            UserMode.ON -> engage(now)
            UserMode.AUTO -> if (!engaged) {
                if (smoothLuma in 0f..config.engageLuma) {
                    if (belowSince < 0) belowSince = now
                    if (now - belowSince >= config.engageHoldMs) engage(now)
                } else belowSince = -1
            } else {
                if (smoothLuma >= config.disengageLuma) {
                    if (aboveSince < 0) aboveSince = now
                    if (now - aboveSince >= config.disengageHoldMs) disengage()
                } else aboveSince = -1
            }
        }

        if (engaged && now > settleUntil) {
            val err = config.targetLuma - smoothLuma.coerceAtLeast(0f)
            if (abs(err) > config.deadband) {
                val delta = (config.gain * err * (config.periodMs / 1000f) * 4f)
                    .coerceIn(-config.slewPerStep, config.slewPerStep)
                level = (level + delta).coerceIn(config.minLevel, 1f)
            }
            applyRingOutput()
            _state.value = State(true, level, userMode)
        }
    }

    @UiThread private fun engage(now: Long) {
        if (engaged) return
        engaged = true; belowSince = -1; aboveSince = -1
        settleUntil = now + config.settleAfterEngageMs
        applyRingOutput()
    }

    @UiThread private fun applyRingOutput() {
        overlay.mode = RingFlashOverlayView.Mode.RING
        overlay.intensity = level
        overlay.tintColor = tintFor(smoothWarmth)
        brightness.apply(level)
    }

    @UiThread private fun disengage() {
        if (!engaged) return
        if (burstInFlight) { pendingDisengage = true; return }   // never kill light mid-exposure
        finishDisengage()
    }

    @UiThread private fun finishDisengage() {
        engaged = false; belowSince = -1; aboveSince = -1
        overlay.setSolidFlash(false)
        overlay.mode = RingFlashOverlayView.Mode.HIDDEN
        brightness.restore()
        _state.value = State(false, 0f, userMode)
    }

    /** Scene warm -> cool light; scene cool -> warm light; else neutral. */
    private fun tintFor(warmth: Float): Int = when {
        !config.autoTint -> 0xFFFFFFFF.toInt()
        warmth > 0.22f -> 0xFFF4F7FF.toInt()
        warmth < -0.22f -> 0xFFFFF1DE.toInt()
        else -> 0xFFFFFFFF.toInt()
    }

    /** Burst only when the ring alone can't reach acceptable face luma. */
    fun burstRecommended(): Boolean = smoothLuma in 0f..0.45f

    /** CameraX 1.4.0+: FLASH_MODE_SCREEN + no hardware flash => CameraX syncs shutter to us. */
    fun cameraXScreenFlash(): ImageCapture.ScreenFlash = object : ImageCapture.ScreenFlash {
        override fun apply(expirationTimeMillis: Long, listener: ImageCapture.ScreenFlashListener) {
            burstInFlight = true
            overlay.setSolidFlash(true)
            brightness.apply(1f)
            scope.launch(Dispatchers.Main) { delay(150); listener.onCompleted() }
        }
        override fun clear() {
            overlay.setSolidFlash(false)
            burstInFlight = false
            when {
                pendingDisengage -> { pendingDisengage = false; finishDisengage() }
                engaged -> brightness.apply(level)
                else -> brightness.restore()
            }
        }
    }

    override fun onPause(owner: LifecycleOwner) { release() }
    override fun onDestroy(owner: LifecycleOwner) { release(); loop?.cancel(); loop = null }

    @UiThread
    fun release() {
        pendingDisengage = false
        if (burstInFlight) return            // clear() will finish the teardown
        engaged = false
        overlay.setSolidFlash(false)
        overlay.mode = RingFlashOverlayView.Mode.HIDDEN
        brightness.restore()
        _state.value = State(false, 0f, userMode)
    }
}

/* ============ 5. ACTIVITY — full-screen edge-to-edge preview, no XML, crash-guarded ============ */
class ScanActivity : AppCompatActivity() {

    companion object {
        private const val REQ_CAMERA = 1
        private const val DEBUG_HUD = true
    }

    private lateinit var previewView: PreviewView
    private lateinit var controller: AutoRingFlashController
    private lateinit var imageCapture: ImageCapture
    private lateinit var bolt: TextView
    private lateinit var hud: TextView
    private val analysisExecutor = Executors.newSingleThreadExecutor()
    @Volatile private var bound = false

    /** Face bbox in NORMALIZED (0..1) analysis-image coords, from your detector. */
    @Volatile var faceRectNormalized: RectF? = null
    /** Convenience if your detector works in analysis pixels. */
    fun setFaceRectPixels(r: Rect, analysisW: Int, analysisH: Int) {
        faceRectNormalized = RectF(r.left.toFloat() / analysisW, r.top.toFloat() / analysisH,
                                   r.right.toFloat() / analysisW, r.bottom.toFloat() / analysisH)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)      // true full-screen preview
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val root = FrameLayout(this).apply { setBackgroundColor(0xFF000000.toInt()) }
        previewView = PreviewView(this).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        }
        val overlay = RingFlashOverlayView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        }
        bolt = TextView(this).apply {
            text = "⚡ AUTO"; setTextColor(0xFFFFFFFF.toInt()); textSize = 14f
            setPadding(dp(10), dp(6), dp(10), dp(6)); setBackgroundColor(0x66000000)
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply { gravity = Gravity.TOP or Gravity.END; setMargins(dp(16), dp(24), dp(16), 0) }
            setOnClickListener { cycleMode() }
            contentDescription = "Ring light mode"
        }
        hud = TextView(this).apply {
            setTextColor(0xCC00FF00.toInt()); textSize = 11f
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply { gravity = Gravity.BOTTOM or Gravity.START; setMargins(dp(16), 0, dp(16), dp(24)) }
            visibility = if (DEBUG_HUD) android.view.View.VISIBLE else android.view.View.GONE
        }
        root.addView(previewView); root.addView(overlay); root.addView(bolt); root.addView(hud)
        setContentView(root)

        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            bolt.updatePadding(top = bars.top + dp(6))
            hud.updatePadding(bottom = bars.bottom + dp(6))
            insets
        }

        controller = AutoRingFlashController(
            lifecycleScope, overlay, ScreenBrightnessController(window))
        lifecycle.addObserver(controller)
        controller.start()

        lifecycleScope.launch {
            controller.state.collect { s ->
                hud.text = String.format(Locale.US, "luma=%.2f warm=%+.2f level=%.2f %s%s",
                    controller.debugLuma, controller.debugWarmth, s.level,
                    s.userMode.name, if (s.engaged) " • RING ON" else "")
            }
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED) bindCamera()
        else requestPermissions(arrayOf(Manifest.permission.CAMERA), REQ_CAMERA)
    }

    private fun cycleMode() {
        controller.userMode = when (controller.userMode) {
            AutoRingFlashController.UserMode.AUTO -> AutoRingFlashController.UserMode.ON
            AutoRingFlashController.UserMode.ON -> AutoRingFlashController.UserMode.OFF
            AutoRingFlashController.UserMode.OFF -> AutoRingFlashController.UserMode.AUTO
        }
        bolt.text = "⚡ ${controller.userMode.name}"
    }

    private fun bindCamera() {
        val providerFuture = ProcessCameraProvider.getInstance(this)
        providerFuture.addListener({
            if (isDestroyed || isFinishing) return@addListener
            val provider = providerFuture.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }
            val analysis = ImageAnalysis.Builder()
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                .setTargetResolution(Size(480, 640))
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build().also { a ->
                    a.setAnalyzer(analysisExecutor,
                        FaceLumaAnalyzer({ faceRectNormalized }) { l, w -> controller.onSample(l, w) })
                }
            imageCapture = ImageCapture.Builder()
                .setFlashMode(ImageCapture.FLASH_MODE_SCREEN)
                .build().also { it.screenFlash = controller.cameraXScreenFlash() }
            provider.unbindAll()
            provider.bindToLifecycle(this, CameraSelector.DEFAULT_FRONT_CAMERA,
                preview, analysis, imageCapture)
            bound = true
            controller.noteCameraBound()
        }, ContextCompat.getMainExecutor(this))
    }

    override fun onRequestPermissionsResult(rc: Int, perms: Array<out String>, res: IntArray) {
        super.onRequestPermissionsResult(rc, perms, res)
        if (rc == REQ_CAMERA && res.firstOrNull() == PackageManager.PERMISSION_GRANTED) bindCamera()
    }

    /** Auto-capture state machine entry point; burst fires only when actually dark. */
    fun takeScanFrame(cb: ImageCapture.OnImageCapturedCallback) {
        if (!bound) return
        imageCapture.flashMode =
            if (controller.burstRecommended()) ImageCapture.FLASH_MODE_SCREEN
            else ImageCapture.FLASH_MODE_OFF
        imageCapture.takePicture(ContextCompat.getMainExecutor(this), cb)
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    override fun onDestroy() {
        super.onDestroy()                       // unbinds camera FIRST ...
        analysisExecutor.shutdownNow()          // ... then stop the analyzer executor
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
}
