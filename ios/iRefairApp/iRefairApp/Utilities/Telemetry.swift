import Foundation
import OSLog

#if canImport(Sentry)
import Sentry
#endif

enum Telemetry {
    private static let logger = Logger(subsystem: "com.irefair.app", category: "telemetry")

    private static func onMain(_ block: @escaping () -> Void) {
        if Thread.isMainThread {
            block()
        } else {
            DispatchQueue.main.async(execute: block)
        }
    }

    static func configure() {
        let dsn = Bundle.main.object(forInfoDictionaryKey: "SENTRY_DSN") as? String ?? ""
        guard !dsn.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            logger.info("Telemetry disabled (missing DSN).")
            return
        }

        #if canImport(Sentry)
        let environment = Bundle.main.object(forInfoDictionaryKey: "SENTRY_ENVIRONMENT") as? String ?? "production"
        let release = Bundle.main.object(forInfoDictionaryKey: "SENTRY_RELEASE") as? String ?? ""

        onMain {
            SentrySDK.start { options in
                options.dsn = dsn
                options.environment = environment
                if !release.isEmpty {
                    options.releaseName = release
                }
                options.enableAutoSessionTracking = true
                options.attachScreenshot = false
                options.attachViewHierarchy = false
            }
        }
        logger.info("Telemetry configured.")
        #else
        logger.info("Sentry package not available; telemetry disabled.")
        #endif
    }

    static func track(_ event: String, properties: [String: String] = [:]) {
        logger.info("Event: \(event, privacy: .public) props: \(properties, privacy: .public)")
        #if canImport(Sentry)
        onMain {
            if properties.isEmpty {
                SentrySDK.capture(message: event)
            } else {
                let message = "\(event) \(properties)"
                SentrySDK.capture(message: message)
            }
        }
        #endif
    }

    static func capture(_ error: Error) {
        logger.error("Error: \(error.localizedDescription, privacy: .public)")
        #if canImport(Sentry)
        let capturedError = error as NSError
        onMain {
            SentrySDK.capture(error: capturedError)
        }
        #endif
    }
}
