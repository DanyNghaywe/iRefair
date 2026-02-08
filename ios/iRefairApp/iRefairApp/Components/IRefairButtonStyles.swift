import SwiftUI

struct IRefairPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        let isPressed = configuration.isPressed

        configuration.label
            .font(Theme.font(size: 14, weight: .bold))
            .foregroundStyle(Color.white)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 44)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(hex: isPressed ? 0x1D4ED8 : 0x3B82F6),
                        Color(hex: 0x2563EB),
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color(hex: 0x3B82F6).opacity(0.4), lineWidth: 1)
            )
            .shadow(color: Color(hex: 0x3B82F6).opacity(isPressed ? 0.25 : 0.3), radius: isPressed ? 7 : 14, x: 0, y: isPressed ? 4 : 8)
            .scaleEffect(isPressed ? 0.98 : 1)
            .opacity(isPressed ? 0.95 : 1)
    }
}
