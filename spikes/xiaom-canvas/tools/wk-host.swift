import AppKit
import WebKit
// wk <url> [out.png] [delaySec]  — a WKWebView window (like the Tauri app). With out.png: snapshot after delay, then quit.
let a = CommandLine.arguments
let url = URL(string: a[1])!
let out = a.count > 2 ? a[2] : ""
let delay = a.count > 3 ? Double(a[3])! : 2.5
let app = NSApplication.shared
app.setActivationPolicy(.regular)
class D: NSObject, NSApplicationDelegate {
  var w: NSWindow!; var v: WKWebView!
  func applicationDidFinishLaunching(_ n: Notification) {
    w = NSWindow(contentRect: NSRect(x: 200, y: 200, width: 640, height: 660), styleMask: [.titled, .closable], backing: .buffered, defer: false)
    w.title = "xiaom canvas spike"
    v = WKWebView(frame: w.contentView!.bounds, configuration: WKWebViewConfiguration()); v.autoresizingMask = [.width, .height]
    w.contentView!.addSubview(v); v.load(URLRequest(url: url))
    w.makeKeyAndOrderFront(nil); app.activate(ignoringOtherApps: true)
    if out != "" {
      DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
        let cfg = WKSnapshotConfiguration(); cfg.snapshotWidth = NSNumber(value: 1280)
        self.v.takeSnapshot(with: cfg) { img, err in
          if let img = img, let t = img.tiffRepresentation, let b = NSBitmapImageRep(data: t), let p = b.representation(using: .png, properties: [:]) {
            try? p.write(to: URL(fileURLWithPath: out)); print("saved", out, b.pixelsWide, b.pixelsHigh)
          } else { print("snapshot failed", err as Any) }
          exit(0)
        }
      }
    }
  }
}
let d = D(); app.delegate = d; app.run()
