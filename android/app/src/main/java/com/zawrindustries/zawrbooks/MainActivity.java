package com.zawrindustries.zawrbooks;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;

public class MainActivity extends Activity {

    private WebView mWebView;
    private ProgressBar mProgressBar;
    private ValueCallback<Uri[]> mFilePathCallback;
    private static final int FILE_CHOOSER_RESULT_CODE = 1001;

    private static final String PREFS_NAME = "ZawrBooksConfig";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String DEFAULT_URL = "https://books.zawrindustries.com/mobile";

    private SharedPreferences mPrefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        mPrefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        mWebView = findViewById(R.id.webview);
        mProgressBar = findViewById(R.id.progressBar);

        configureWebView();

        String configuredUrl = mPrefs.getString(KEY_SERVER_URL, DEFAULT_URL);
        mWebView.loadUrl(configuredUrl);
    }

    private void configureWebView() {
        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " ZawrBooksMobileApp/1.0.0");

        // Enable cookies & session management
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(mWebView, true);

        mWebView.addJavascriptInterface(new WebAppInterface(this), "ZawrApp");
        mWebView.setWebViewClient(new AppWebViewClient(this));
        mWebView.setWebChromeClient(new AppWebChromeClient(this));
    }

    public void showSetupPage(String currentUrl) {
        String cleanCurrent = currentUrl == null ? "" : currentUrl.replace("/mobile", "");
        String setupHtml = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'>"
                + "<style>"
                + "* { box-sizing: border-box; margin: 0; padding: 0; }"
                + "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F4F3EF; color: #111; padding: 32px 20px; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }"
                + ".card { background: #FFFFFF; border: 1px solid #CCCCCC; padding: 28px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); max-width: 440px; margin: 0 auto; width: 100%; }"
                + ".brand { font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 6px; font-family: monospace; }"
                + "h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #111; }"
                + "p { font-size: 13px; color: #666; line-height: 1.5; margin-bottom: 20px; }"
                + "label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #444; margin-bottom: 6px; }"
                + "input { width: 100%; padding: 12px 14px; font-size: 14px; border: 1px solid #CCCCCC; outline: none; background: #FAFAF9; margin-bottom: 16px; font-family: monospace; }"
                + "input:focus { border-color: #111; background: #FFF; }"
                + "button { width: 100%; background: #111111; color: #FFFFFF; border: none; padding: 14px; font-size: 14px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: opacity 0.2s; }"
                + "button:active { opacity: 0.85; }"
                + ".note { font-size: 11px; color: #888; margin-top: 14px; text-align: center; line-height: 1.4; }"
                + "</style></head><body>"
                + "<div class='card'>"
                + "<div class='brand'>ZAWR INDUSTRIES &bull; MOBILE APP</div>"
                + "<h1>Connect Mobile Server</h1>"
                + "<p>Enter your live Vercel deployment URL or custom domain to connect this mobile app directly to your books.</p>"
                + "<label for='urlInput'>Server / Vercel Domain</label>"
                + "<input id='urlInput' type='text' placeholder='https://books.zawrindustries.com' value='" + (cleanCurrent.isEmpty() ? "https://books.zawrindustries.com" : cleanCurrent) + "' autocorrect='off' autocapitalize='none' spellcheck='false' />"
                + "<button onclick='submitUrl()'>Save & Connect</button>"
                + "<div class='note'>You only need to configure this once. The app will remember your server domain automatically.</div>"
                + "</div>"
                + "<script>"
                + "function submitUrl() {"
                + "  var val = document.getElementById('urlInput').value.trim();"
                + "  if (!val) { alert('Please enter your server URL'); return; }"
                + "  if (window.ZawrApp && window.ZawrApp.saveAndConnect) {"
                + "    window.ZawrApp.saveAndConnect(val);"
                + "  } else {"
                + "    alert('Android Bridge unavailable.');"
                + "  }"
                + "}"
                + "</script></body></html>";
        mWebView.loadDataWithBaseURL(null, setupHtml, "text/html", "utf-8", null);
    }

    static class WebAppInterface {
        private final MainActivity activity;

        public WebAppInterface(MainActivity activity) {
            this.activity = activity;
        }

        @android.webkit.JavascriptInterface
        public void saveAndConnect(String url) {
            if (url == null || url.trim().isEmpty()) return;
            String clean = url.trim();
            if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
                clean = "https://" + clean;
            }
            if (clean.endsWith("/")) {
                clean = clean.substring(0, clean.length() - 1);
            }
            if (!clean.endsWith("/mobile")) {
                clean += "/mobile";
            }
            final String finalUrl = clean;
            activity.mPrefs.edit().putString(KEY_SERVER_URL, finalUrl).apply();
            activity.runOnUiThread(new UrlLoaderRunnable(activity.mWebView, finalUrl));
        }

        @android.webkit.JavascriptInterface
        public void resetServer() {
            activity.runOnUiThread(new SetupPageRunnable(activity));
        }
    }

    static class UrlLoaderRunnable implements Runnable {
        private final WebView view;
        private final String url;

        public UrlLoaderRunnable(WebView view, String url) {
            this.view = view;
            this.url = url;
        }

        @Override
        public void run() {
            view.loadUrl(url);
        }
    }

    static class SetupPageRunnable implements Runnable {
        private final MainActivity activity;

        public SetupPageRunnable(MainActivity activity) {
            this.activity = activity;
        }

        @Override
        public void run() {
            activity.showSetupPage(activity.mPrefs.getString(KEY_SERVER_URL, ""));
        }
    }

    public void handleError() {
        runOnUiThread(new SetupPageRunnable(this));
    }

    static class AppWebViewClient extends WebViewClient {
        private final MainActivity activity;

        public AppWebViewClient(MainActivity activity) {
            this.activity = activity;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            view.loadUrl(url);
            return true;
        }

        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            activity.handleError();
        }
    }

    static class AppWebChromeClient extends WebChromeClient {
        private final MainActivity activity;

        public AppWebChromeClient(MainActivity activity) {
            this.activity = activity;
        }

        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            if (activity.mProgressBar != null) {
                if (newProgress < 100) {
                    activity.mProgressBar.setVisibility(View.VISIBLE);
                } else {
                    activity.mProgressBar.setVisibility(View.GONE);
                }
            }
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                          FileChooserParams fileChooserParams) {
            if (activity.mFilePathCallback != null) {
                activity.mFilePathCallback.onReceiveValue(null);
            }
            activity.mFilePathCallback = filePathCallback;

            Intent intent = fileChooserParams.createIntent();
            try {
                activity.startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE);
            } catch (Exception e) {
                activity.mFilePathCallback = null;
                return false;
            }
            return true;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (mFilePathCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    } else if (data.getClipData() != null) {
                        int numSelected = data.getClipData().getItemCount();
                        results = new Uri[numSelected];
                        for (int i = 0; i < numSelected; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    }
                }
                mFilePathCallback.onReceiveValue(results);
                mFilePathCallback = null;
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
