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

/// Web-style shimmering placeholder block used for table/list loading states.
struct IRefairSkeletonBlock: View {
    var width: CGFloat? = nil
    var height: CGFloat = 12
    var cornerRadius: CGFloat = 6
    var delay: Double = 0

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isAnimating = false

    private let baseColor = Color.white.opacity(0.04)
    private let shimmerStops: [Gradient.Stop] = [
        .init(color: Color.white.opacity(0.04), location: 0),
        .init(color: Color.white.opacity(0.12), location: 0.4),
        .init(color: Color.white.opacity(0.12), location: 0.6),
        .init(color: Color.white.opacity(0.04), location: 1),
    ]

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)

        shape
            .fill(baseColor)
            .overlay {
                GeometryReader { proxy in
                    let shimmerWidth = max(proxy.size.width * 2, 1)

                    LinearGradient(gradient: Gradient(stops: shimmerStops), startPoint: .leading, endPoint: .trailing)
                        .frame(width: shimmerWidth, height: proxy.size.height)
                        .offset(x: reduceMotion ? -proxy.size.width * 0.25 : (isAnimating ? -shimmerWidth : proxy.size.width))
                }
            }
            .clipShape(shape)
            .frame(width: width, height: height)
            .frame(maxWidth: width == nil ? .infinity : nil, alignment: .leading)
            .onAppear {
                guard !reduceMotion, !isAnimating else { return }
                withAnimation(.easeInOut(duration: 1.4).delay(delay).repeatForever(autoreverses: false)) {
                    isAnimating = true
                }
            }
            .accessibilityHidden(true)
    }
}
