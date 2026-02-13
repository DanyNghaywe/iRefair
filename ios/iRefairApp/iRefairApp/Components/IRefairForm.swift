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

enum IRefairEmptyStateTone {
    case darkOnLight
    case lightOnDark

    var titleColor: Color {
        switch self {
        case .darkOnLight:
            return Color(hex: 0x0F172A)
        case .lightOnDark:
            return Color(hex: 0xF8FAFC)
        }
    }

    var descriptionColor: Color {
        switch self {
        case .darkOnLight:
            return Color(hex: 0x0F172A, alpha: 0.75)
        case .lightOnDark:
            return Color(hex: 0xCBD5E1)
        }
    }

    var illustrationBaseColor: Color {
        switch self {
        case .darkOnLight:
            return Color(hex: 0x0F172A, alpha: 0.85)
        case .lightOnDark:
            return Color(hex: 0xF8FAFC)
        }
    }
}

/// Mirrors the web `.empty-state` layout used in table empty rows.
struct IRefairTableEmptyState: View {
    let title: String
    let description: String
    var tone: IRefairEmptyStateTone = .darkOnLight

    var body: some View {
        VStack(spacing: 20) {
            IRefairPortalEmptyIllustration(color: tone.illustrationBaseColor)
            VStack(spacing: 8) {
                Text(title)
                    .font(Theme.font(size: 18, weight: .bold))
                    .foregroundStyle(tone.titleColor)
                    .multilineTextAlignment(.center)

                Text(description)
                    .font(Theme.font(size: 14))
                    .foregroundStyle(tone.descriptionColor)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
            }
            .frame(maxWidth: 320)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
        .padding(.horizontal, 24)
        .accessibilityElement(children: .combine)
    }
}

private struct IRefairPortalEmptyIllustration: View {
    let color: Color

    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.15), lineWidth: 1.5)
                .frame(width: 76, height: 76)

            Circle()
                .stroke(color.opacity(0.1), lineWidth: 1.5)
                .frame(width: 56, height: 56)

            RoundedRectangle(cornerRadius: 3, style: .continuous)
                .stroke(color.opacity(0.4), lineWidth: 2)
                .frame(width: 32, height: 28)

            Rectangle()
                .fill(color.opacity(0.3))
                .frame(width: 32, height: 2)
                .offset(y: -6)

            Circle()
                .fill(color.opacity(0.3))
                .frame(width: 3, height: 3)
                .offset(x: -10, y: -10)

            Circle()
                .fill(color.opacity(0.3))
                .frame(width: 3, height: 3)
                .offset(x: -5, y: -10)

            Circle()
                .fill(color.opacity(0.3))
                .frame(width: 3, height: 3)
                .offset(x: 0, y: -10)

            Capsule()
                .fill(color.opacity(0.25))
                .frame(width: 20, height: 2)
                .offset(y: 2)

            Capsule()
                .fill(color.opacity(0.25))
                .frame(width: 12, height: 2)
                .offset(x: -4, y: 8)
        }
        .frame(width: 80, height: 80)
        .accessibilityHidden(true)
    }
}
