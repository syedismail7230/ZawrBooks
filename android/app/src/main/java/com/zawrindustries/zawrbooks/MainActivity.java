package com.zawrindustries.zawrbooks;

import android.app.Activity;
import android.content.Intent;
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

    // Default target: Zawr Books Mobile production endpoint
    private static final String TARGET_URL = "https://zawr-books.vercel.app/mobile";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        mWebView = findViewById(R.id.webview);
        mProgressBar = findViewById(R.id.progressBar);

        configureWebView();
        mWebView.loadUrl(TARGET_URL);
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

        mWebView.setWebViewClient(new AppWebViewClient());
        mWebView.setWebChromeClient(new AppWebChromeClient(this));
    }

    static class AppWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            view.loadUrl(url);
            return true;
        }

        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            String errorHtml = "<html><body style='font-family:sans-serif;text-align:center;padding:50px 20px;background:#F4F3EF;color:#111;'>"
                    + "<h2 style='font-size:18px;margin-bottom:10px;'>Connection Notice</h2>"
                    + "<p style='font-size:13px;color:#666;line-height:1.5;'>Unable to reach Zawr Books Mobile server. Please ensure you are connected to the Internet.</p>"
                    + "<p style='font-size:11px;color:#999;font-family:monospace;margin:15px 0;'>" + description + "</p>"
                    + "<button onclick='location.reload()' style='background:#111;color:#fff;border:none;padding:10px 24px;font-size:13px;font-weight:bold;cursor:pointer;margin-top:10px;'>Retry</button>"
                    + "</body></html>";
            view.loadDataWithBaseURL(null, errorHtml, "text/html", "utf-8", null);
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
