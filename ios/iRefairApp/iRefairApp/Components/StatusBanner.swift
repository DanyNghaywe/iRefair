import SwiftUI

struct StatusBanner: View {
    enum Style {
        case success
        case error
        case warning
        case info

        var tint: Color {
            switch self {
            case .success: return Theme.success.opacity(0.14)
            case .error: return Theme.error.opacity(0.14)
            case .warning: return Theme.warning.opacity(0.18)
            case .info: return Theme.info.opacity(0.12)
            }
        }

        var foreground: Color {
            switch self {
            case .success: return Theme.success
            case .error: return Theme.error
            case .warning: return Theme.warning
            case .info: return Theme.info
            }
        }

        var systemImage: String {
            switch self {
            case .success: return "checkmark.circle.fill"
            case .error: return "exclamationmark.triangle.fill"
            case .warning: return "wifi.slash"
            case .info: return "info.circle.fill"
            }
        }
    }

    let text: String
    let style: Style

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: style.systemImage)
                .foregroundStyle(style.foreground)
            Text(text)
                .foregroundStyle(Theme.ink)
                .font(Theme.font(.subheadline))
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(style.tint)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Theme.glassGradient)
                        .opacity(0.6)
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(style.foreground.opacity(0.25), lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
    }
}
