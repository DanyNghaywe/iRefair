import SwiftUI

struct IRefairPrimaryButtonStyle: ButtonStyle {
    let fillWidth: Bool

    init(fillWidth: Bool = true) {
        self.fillWidth = fillWidth
    }

    func makeBody(configuration: Configuration) -> some View {
        StyledPrimaryButton(
            configuration: configuration,
            fillWidth: fillWidth
        )
    }
}

private struct StyledPrimaryButton: View {
    let configuration: ButtonStyle.Configuration
    let fillWidth: Bool

    @Environment(\.isEnabled) private var isEnabled

    var body: some View {
        let isPressed = isEnabled && configuration.isPressed
        let gradientColors: [Color] = isEnabled
            ? [
                Color(hex: isPressed ? 0x1D4ED8 : 0x3B82F6),
                Color(hex: 0x2563EB),
            ]
            : [
                Color(hex: 0x94A3B8),
                Color(hex: 0x64748B),
            ]
        let borderColor = isEnabled
            ? Color(hex: 0x3B82F6).opacity(0.4)
            : Color.white.opacity(0.2)

        configuration.label
            .font(Theme.font(size: 14, weight: .bold))
            .foregroundStyle(Color.white.opacity(isEnabled ? 1 : 0.8))
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .frame(maxWidth: fillWidth ? .infinity : nil)
            .frame(minHeight: 44)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: gradientColors),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(borderColor, lineWidth: 1)
            )
            .shadow(
                color: isEnabled
                    ? Color(hex: 0x3B82F6).opacity(isPressed ? 0.25 : 0.3)
                    : Color.clear,
                radius: isEnabled ? (isPressed ? 7 : 14) : 0,
                x: 0,
                y: isEnabled ? (isPressed ? 4 : 8) : 0
            )
            .scaleEffect(isPressed ? 0.98 : 1)
            .opacity(isEnabled ? (isPressed ? 0.95 : 1) : 0.72)
    }
}
