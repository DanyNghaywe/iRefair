import SwiftUI
import UIKit

enum Theme {
    static let accentPrimary = Color(hex: 0x3D8BFD)
    static let accentSecondary = Color(hex: 0xF47C5D)
    static let accentTertiary = Color(hex: 0xFFD166)

    static let ink = Color(hex: 0x0F172A)
    static let muted = Color(hex: 0x5D6174)
    static let line = Color(hex: 0xE2E6F1)

    static let panel = Color.white
    static let panelSoft = Color(hex: 0xF3EDFF)
    static let paper = Color.white.opacity(0.88)

    static let inputBackground = Color.white.opacity(0.32)
    static let inputBackgroundFocused = Color.white.opacity(0.64)
    static let inputBorder = Color.white.opacity(0.12)
    static let inputBorderFocused = Color(hex: 0x3D8BFD).opacity(0.45)
    static let inputRadius: CGFloat = 14

    static let error = Color(hex: 0xE75D6B)
    static let warning = Color(hex: 0xFBBF24)
    static let success = Color(hex: 0x22C55E)
    static let info = accentPrimary

    static let backgroundBase = Color(hex: 0x0F343C)
    static let backgroundBodyStart = Color(red: 223.0 / 255.0, green: 243.0 / 255.0, blue: 248.0 / 255.0).opacity(0.42)
    static let backgroundBodyMid = Color(red: 19.0 / 255.0, green: 80.0 / 255.0, blue: 88.0 / 255.0).opacity(0.58)
    static let backgroundBodyEnd = Color(hex: 0x0F343C)
    static let backgroundHeroStart = Color(red: 223.0 / 255.0, green: 243.0 / 255.0, blue: 248.0 / 255.0).opacity(0.36)
    static let backgroundHeroMid = Color(red: 19.0 / 255.0, green: 80.0 / 255.0, blue: 88.0 / 255.0).opacity(0.62)
    static let backgroundHeroEnd = Color(hex: 0x0B2B32)
    static let backgroundHeroOpacity = 0.88
    static let backgroundOverlayStart = Color(red: 19.0 / 255.0, green: 80.0 / 255.0, blue: 88.0 / 255.0).opacity(0.10)
    static let backgroundOverlayEnd = Color(red: 19.0 / 255.0, green: 80.0 / 255.0, blue: 88.0 / 255.0).opacity(0.64)

    static let boardRadius: CGFloat = 24
    static let glassRadius: CGFloat = 20
    static let sectionRadius: CGFloat = 16
    static let legendRadius: CGFloat = 12

    // Layout spacing aligned to the mobile web app.
    static let appPaddingHorizontal: CGFloat = 14
    static let appPaddingVertical: CGFloat = 20
    static let boardPadding: CGFloat = 18
    static let boardGap: CGFloat = 32
    static let cardHeaderPaddingVertical: CGFloat = 18
    static let cardHeaderTextGap: CGFloat = 10
    static let fieldGap: CGFloat = 20
    static let fieldLabelGap: CGFloat = 8
    static let fieldLabelFontSize: CGFloat = 14
    static let fieldLabelKerning: CGFloat = -0.14

    static let boardGradient = LinearGradient(
        gradient: Gradient(colors: [
            Color.white.opacity(0.04),
            Color.white.opacity(0.01),
        ]),
        startPoint: .top,
        endPoint: .bottom
    )
    static let boardBorder = Color.white.opacity(0.04)
    static let boardShadow = Color(hex: 0x0F172A).opacity(0.08)

    static let sectionGradient = LinearGradient(
        gradient: Gradient(colors: [
            Color.white.opacity(0.12),
            Color.white.opacity(0.04),
        ]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    static let sectionBorder = Color.white.opacity(0.18)
    static let sectionShadow = Color(hex: 0x0F172A).opacity(0.08)

    static let legendBackground = Color.white.opacity(0.32)
    static let legendBorder = Color.white.opacity(0.2)

    static let segmentBackground = Color.white.opacity(0.12)
    static let segmentBorder = Color.white.opacity(0.28)

    static let glassGradient = LinearGradient(
        gradient: Gradient(colors: [
            Color.white.opacity(0.18),
            Color.white.opacity(0.08),
        ]),
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    static let glassBorder = Color.white.opacity(0.22)
    static let glassShadow = Color(hex: 0x0F172A).opacity(0.12)
    static let glassHighlight = Color.white.opacity(0.24)

    static func font(_ style: Font.TextStyle, weight: Font.Weight = .regular) -> Font {
        let uiStyle = uiTextStyle(from: style)
        let size = UIFont.preferredFont(forTextStyle: uiStyle).pointSize
        if let name = manropeName(for: weight), UIFont(name: name, size: size) != nil {
            return .custom(name, size: size, relativeTo: style)
        }
        return .system(style, design: .default).weight(weight)
    }

    static func font(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        if let name = manropeName(for: weight), UIFont(name: name, size: size) != nil {
            return .custom(name, size: size)
        }
        return .system(size: size, weight: weight, design: .default)
    }

    static func uiFont(size: CGFloat, weight: UIFont.Weight = .regular) -> UIFont {
        if let name = manropeName(for: weight), let font = UIFont(name: name, size: size) {
            return font
        }
        return UIFont.systemFont(ofSize: size, weight: weight)
    }

    private static func uiTextStyle(from style: Font.TextStyle) -> UIFont.TextStyle {
        switch style {
        case .largeTitle: return .largeTitle
        case .title: return .title1
        case .title2: return .title2
        case .title3: return .title3
        case .headline: return .headline
        case .subheadline: return .subheadline
        case .callout: return .callout
        case .caption: return .caption1
        case .caption2: return .caption2
        case .footnote: return .footnote
        default: return .body
        }
    }

    private static func manropeName(for weight: Font.Weight) -> String? {
        switch weight {
        case .ultraLight, .thin: return "Manrope-ExtraLight"
        case .light: return "Manrope-Light"
        case .regular: return "Manrope-Regular"
        case .medium: return "Manrope-Medium"
        case .semibold: return "Manrope-SemiBold"
        case .bold: return "Manrope-Bold"
        case .heavy, .black: return "Manrope-ExtraBold"
        default: return "Manrope-Regular"
        }
    }

    private static func manropeName(for weight: UIFont.Weight) -> String? {
        switch weight {
        case .ultraLight, .thin: return "Manrope-ExtraLight"
        case .light: return "Manrope-Light"
        case .regular: return "Manrope-Regular"
        case .medium: return "Manrope-Medium"
        case .semibold: return "Manrope-SemiBold"
        case .bold: return "Manrope-Bold"
        case .heavy, .black: return "Manrope-ExtraBold"
        default: return "Manrope-Regular"
        }
    }
}

struct IRefairBackground: View {
    var body: some View {
        GeometryReader { proxy in
            let viewportSize = resolvedViewportSize(fallback: proxy.size)
            ZStack {
                Theme.backgroundBase
                EllipticalRadialGradientLayer(
                    stops: [
                        .init(color: Theme.backgroundBodyStart, location: 0),
                        .init(color: Theme.backgroundBodyMid, location: 0.42),
                        .init(color: Theme.backgroundBodyEnd, location: 1),
                    ],
                    center: UnitPoint(x: 0.5, y: 0.30)
                )
                ZStack {
                    EllipticalRadialGradientLayer(
                        stops: [
                            .init(color: Theme.backgroundHeroStart, location: 0),
                            .init(color: Theme.backgroundHeroMid, location: 0.44),
                            .init(color: Theme.backgroundHeroEnd, location: 1),
                        ],
                        center: UnitPoint(x: 0.5, y: 0.32)
                    )
                    EllipticalRadialGradientLayer(
                        stops: [
                            .init(color: Theme.backgroundOverlayStart, location: 0),
                            .init(color: Theme.backgroundOverlayEnd, location: 0.7),
                        ],
                        center: .center
                    )
                    .blendMode(.screen)
                }
                .opacity(Theme.backgroundHeroOpacity)
                ParticlesBackground(size: viewportSize)
            }
            .frame(width: viewportSize.width, height: viewportSize.height, alignment: .topLeading)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .ignoresSafeArea()
        }
    }
}

private func resolvedViewportSize(fallback: CGSize) -> CGSize {
    #if os(iOS)
    let sceneSize = UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .flatMap { $0.windows }
        .first(where: { $0.isKeyWindow })?
        .bounds
        .size
    let screenSize = UIScreen.main.bounds.size
    let width = max(fallback.width, sceneSize?.width ?? 0, screenSize.width)
    let height = max(fallback.height, sceneSize?.height ?? 0, screenSize.height)
    return CGSize(width: width, height: height)
    #else
    return fallback
    #endif
}

private struct EllipticalRadialGradientLayer: View {
    let stops: [Gradient.Stop]
    let center: UnitPoint

    var body: some View {
        Canvas { context, size in
            guard size.width > 0, size.height > 0 else { return }

            let centerPoint = CGPoint(x: size.width * center.x, y: size.height * center.y)
            let baseXRadius = max(centerPoint.x, size.width - centerPoint.x)
            let baseYRadius = max(centerPoint.y, size.height - centerPoint.y)
            guard baseXRadius > 0, baseYRadius > 0 else { return }

            // CSS `radial-gradient(ellipse ...)` defaults to `farthest-corner`.
            // Scale side-based radii so the ellipse reaches the farthest corner.
            let corners: [CGPoint] = [
                .init(x: 0, y: 0),
                .init(x: size.width, y: 0),
                .init(x: 0, y: size.height),
                .init(x: size.width, y: size.height),
            ]
            let farthestCornerScale = corners
                .map { corner -> CGFloat in
                    let dx = abs(corner.x - centerPoint.x) / baseXRadius
                    let dy = abs(corner.y - centerPoint.y) / baseYRadius
                    return sqrt((dx * dx) + (dy * dy))
                }
                .max() ?? 1

            let xRadius = baseXRadius * farthestCornerScale
            let yRadius = baseYRadius * farthestCornerScale
            let maxRadius = max(xRadius, yRadius)
            guard maxRadius > 0 else { return }

            let scaleX = xRadius / maxRadius
            let scaleY = yRadius / maxRadius
            let shading = GraphicsContext.Shading.radialGradient(
                Gradient(stops: stops),
                center: centerPoint,
                startRadius: 0,
                endRadius: maxRadius
            )

            context.drawLayer { layer in
                var transform = CGAffineTransform.identity
                transform = transform.translatedBy(x: centerPoint.x, y: centerPoint.y)
                transform = transform.scaledBy(x: scaleX, y: scaleY)
                transform = transform.translatedBy(x: -centerPoint.x, y: -centerPoint.y)
                layer.concatenate(transform)

                let padding = maxRadius * 2
                let fillRect = CGRect(
                    x: -padding,
                    y: -padding,
                    width: size.width + (padding * 2),
                    height: size.height + (padding * 2)
                )
                layer.fill(Path(fillRect), with: shading)
            }
        }
        .allowsHitTesting(false)
    }
}

struct IRefairScreen<Content: View>: View {
    private let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        ZStack {
            IRefairBackground()
            content
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .toolbarBackground(.hidden, for: .navigationBar)
        .preferredColorScheme(.light)
    }
}

struct IRefairBoardBackground: View {
    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Theme.boardRadius, style: .continuous)
        shape
            .fill(Theme.boardGradient)
            .overlay(
                shape
                    .stroke(Theme.boardBorder, lineWidth: 1)
            )
            .shadow(color: Theme.boardShadow, radius: 24, x: 0, y: 12)
    }
}

extension View {
    @ViewBuilder
    func irefairScreen(includeBackground: Bool = true) -> some View {
        if includeBackground {
            ZStack {
                IRefairBackground()
                self
            }
            .preferredColorScheme(.light)
        } else {
            self
                .preferredColorScheme(.light)
        }
    }
}

extension Color {
    init(hex: Int, alpha: Double = 1.0) {
        let red = Double((hex >> 16) & 0xFF) / 255
        let green = Double((hex >> 8) & 0xFF) / 255
        let blue = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: red, green: green, blue: blue, opacity: alpha)
    }
}

extension UIColor {
    convenience init(hex: Int, alpha: CGFloat = 1.0) {
        let red = CGFloat((hex >> 16) & 0xFF) / 255
        let green = CGFloat((hex >> 8) & 0xFF) / 255
        let blue = CGFloat(hex & 0xFF) / 255
        self.init(red: red, green: green, blue: blue, alpha: alpha)
    }
}
