import SwiftUI

struct StatusBanner: View {
    enum Style {
        case success
        case error
        case warning
        case info

        var tint: Color {
            switch self {
            case .success: return Color.green.opacity(0.15)
            case .error: return Color.red.opacity(0.15)
            case .warning: return Color.orange.opacity(0.15)
            case .info: return Color.blue.opacity(0.12)
            }
        }

        var foreground: Color {
            switch self {
            case .success: return .green
            case .error: return .red
            case .warning: return .orange
            case .info: return .blue
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
                .foregroundStyle(.primary)
                .font(.subheadline)
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(style.tint)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(style.foreground.opacity(0.25), lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
    }
}
