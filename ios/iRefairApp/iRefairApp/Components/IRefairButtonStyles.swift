import SwiftUI

struct IRefairPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.font(.headline, weight: .semibold))
            .foregroundStyle(Color.white)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 44)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(hex: 0x3B82F6),
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
            .shadow(color: Color(hex: 0x3B82F6).opacity(0.3), radius: 12, x: 0, y: 6)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
    }
}
