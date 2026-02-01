import SwiftUI

struct IRefairForm<Content: View>: View {
    private let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        ZStack {
            IRefairBoardBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.boardGap) {
                    content
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, Theme.boardPadding)
                .padding(.vertical, Theme.boardPadding)
            }
            .scrollDismissesKeyboard(.interactively)
            .scrollIndicators(.hidden)
            .foregroundStyle(Theme.ink)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .clipShape(RoundedRectangle(cornerRadius: Theme.boardRadius, style: .continuous))
        .padding(.horizontal, Theme.appPaddingHorizontal)
        .padding(.vertical, Theme.appPaddingVertical)
    }
}
