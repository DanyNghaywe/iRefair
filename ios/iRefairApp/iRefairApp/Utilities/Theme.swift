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

    static let error = Color(hex: 0xE75D6B)
    static let warning = Color(hex: 0xFBBF24)
    static let success = Color(hex: 0x22C55E)
    static let info = accentPrimary

    static let backgroundBase = Color(hex: 0x0F343C)
    static let backgroundStart = Color(red: 223.0 / 255.0, green: 243.0 / 255.0, blue: 248.0 / 255.0).opacity(0.54)
    static let backgroundMid = Color(red: 19.0 / 255.0, green: 80.0 / 255.0, blue: 88.0 / 255.0).opacity(0.62)
    static let backgroundEnd = Color(hex: 0x0B2B32)
    static let backgroundOverlayStart = Color(red: 19.0 / 255.0, green: 80.0 / 255.0, blue: 88.0 / 255.0).opacity(0.22)
    static let backgroundOverlayEnd = Color(red: 19.0 / 255.0, green: 80.0 / 255.0, blue: 88.0 / 255.0).opacity(0.82)

    static let boardRadius: CGFloat = 24
    static let glassRadius: CGFloat = 20

    static let boardGradient = LinearGradient(
        gradient: Gradient(colors: [
            Color.white.opacity(0.05),
            Color.white.opacity(0.01),
        ]),
        startPoint: .top,
        endPoint: .bottom
    )
    static let boardBorder = Color.white.opacity(0.04)
    static let boardShadow = Color(hex: 0x0F172A).opacity(0.08)

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
            let size = max(proxy.size.width, proxy.size.height)
            ZStack {
                Theme.backgroundBase
                RadialGradient(
                    gradient: Gradient(stops: [
                        .init(color: Theme.backgroundStart, location: 0),
                        .init(color: Theme.backgroundMid, location: 0.44),
                        .init(color: Theme.backgroundEnd, location: 1),
                    ]),
                    center: UnitPoint(x: 0.5, y: 0.32),
                    startRadius: 0,
                    endRadius: size
                )
                RadialGradient(
                    gradient: Gradient(stops: [
                        .init(color: Theme.backgroundOverlayStart, location: 0),
                        .init(color: Theme.backgroundOverlayEnd, location: 0.7),
                    ]),
                    center: .center,
                    startRadius: 0,
                    endRadius: size
                )
                .blendMode(.screen)
                ParticlesBackground(size: proxy.size)
            }
            .ignoresSafeArea()
        }
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
