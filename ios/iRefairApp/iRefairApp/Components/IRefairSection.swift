import SwiftUI

struct IRefairSection<Content: View>: View {
    private let title: String?
    private let content: Content

    init(_ title: String? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Theme.sectionRadius, style: .continuous)

        VStack(alignment: .leading, spacing: 12) {
            if let title, !title.isEmpty {
                Text(title)
                    .font(Theme.font(.caption, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                    .padding(.vertical, 6)
                    .padding(.horizontal, 12)
                    .background(
                        RoundedRectangle(cornerRadius: Theme.legendRadius, style: .continuous)
                            .fill(Theme.legendBackground)
                            .overlay(
                                RoundedRectangle(cornerRadius: Theme.legendRadius, style: .continuous)
                                    .stroke(Theme.legendBorder, lineWidth: 1)
                            )
                    )
            }

            content
        }
        .textFieldStyle(IRefairTextFieldStyle())
        .tint(Theme.accentPrimary)
        .padding(.vertical, 12)
        .padding(.horizontal, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            shape
                .fill(.ultraThinMaterial)
                .overlay(shape.fill(Theme.sectionGradient))
                .overlay(shape.stroke(Theme.sectionBorder, lineWidth: 1))
                .shadow(color: Theme.sectionShadow, radius: 12, x: 0, y: 6)
        )
    }
}
