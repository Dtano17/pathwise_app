# ProGuard Rules for JournalMate
# ================================

# Keep line numbers for crash reporting
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# ================================
# Capacitor Core
# ================================
-keep class com.getcapacitor.** { *; }
-keep class ai.journalmate.app.** { *; }
-keepclassmembers class ai.journalmate.app.** {
    @android.webkit.JavascriptInterface <methods>;
}

# WebView JavaScript Interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ================================
# Firebase
# ================================
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Firebase Messaging
-keep class com.google.firebase.messaging.** { *; }
-keepclassmembers class com.google.firebase.messaging.FirebaseMessagingService {
    public void onMessageReceived(com.google.firebase.messaging.RemoteMessage);
    public void onNewToken(java.lang.String);
}

# ================================
# OkHttp & Retrofit (if used)
# ================================
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# ================================
# Gson (JSON serialization)
# ================================
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# ================================
# AndroidX & Support Libraries
# ================================
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# ================================
# Widgets
# ================================
-keep class ai.journalmate.app.widget.** { *; }
-keep class android.appwidget.** { *; }

# ================================
# Broadcast Receivers
# ================================
-keep public class * extends android.content.BroadcastReceiver

# ================================
# Services
# ================================
-keep public class * extends android.app.Service

# ================================
# Native Methods
# ================================
-keepclasseswithmembernames class * {
    native <methods>;
}

# ================================
# Enums
# ================================
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ================================
# Parcelables
# ================================
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# ================================
# Serializable
# ================================
-keepnames class * implements java.io.Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ================================
# Keep R class
# ================================
-keepclassmembers class **.R$* {
    public static <fields>;
}

# ================================
# Stripe (if using Stripe SDK)
# ================================
-keep class com.stripe.** { *; }
-dontwarn com.stripe.**

# ================================
# Remove Logging in Release
# ================================
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
