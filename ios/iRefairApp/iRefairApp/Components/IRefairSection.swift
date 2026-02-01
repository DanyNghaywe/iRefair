import SwiftUI

struct IRefairSection<Content: View>: View {
    private let title: String?
    private let content: Content
    @State private var titleHeight: CGFloat = 0

    private let titleGap: CGFloat = 12

    init(_ title: String? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Theme.sectionRadius, style: .continuous)
        let hasTitle = title?.isEmpty == false
        let titleOverlap: CGFloat = titleHeight > 0 ? titleHeight / 2 : 12
        let contentTopPadding: CGFloat = hasTitle ? titleOverlap + titleGap : 12

        ZStack(alignment: .topLeading) {
            VStack(alignment: .leading, spacing: 12) {
                content
            }
            .textFieldStyle(IRefairTextFieldStyle())
            .tint(Theme.accentPrimary)
            .padding(.top, contentTopPadding)
            .padding(.bottom, 12)
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                shape
                    .fill(.ultraThinMaterial)
                    .overlay(shape.fill(Theme.sectionGradient))
                    .overlay(shape.stroke(Theme.sectionBorder, lineWidth: 1))
                    .shadow(color: Theme.sectionShadow, radius: 12, x: 0, y: 6)
            )

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
                    .background(
                        GeometryReader { proxy in
                            Color.clear.preference(key: IRefairSectionTitleHeightKey.self, value: proxy.size.height)
                        }
                    )
                    .padding(.leading, 14)
                    .offset(y: -titleOverlap)
                    .onPreferenceChange(IRefairSectionTitleHeightKey.self) { height in
                        if abs(titleHeight - height) > 0.5 {
                            titleHeight = height
                        }
                    }
            }
        }
    }
}

private struct IRefairSectionTitleHeightKey: PreferenceKey {
    static var defaultValue: CGFloat = 0

    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}
