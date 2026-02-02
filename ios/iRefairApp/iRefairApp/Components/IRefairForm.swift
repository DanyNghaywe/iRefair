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

struct IRefairCardHeader: View {
    let eyebrow: String
    let title: String
    let lead: String

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.cardHeaderTextGap) {
            Text(eyebrow)
                .font(Theme.font(size: 11, weight: .semibold))
                .foregroundStyle(Color.white.opacity(0.7))
                .textCase(.uppercase)
                .kerning(1.1)
            Text(title)
                .font(Theme.font(size: 24, weight: .bold))
                .foregroundStyle(Color.white)
                .kerning(-0.5)
            Text(lead)
                .font(Theme.font(size: 16))
                .foregroundStyle(Color.white.opacity(0.85))
                .lineSpacing(4)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, Theme.cardHeaderPaddingVertical)
    }
}
