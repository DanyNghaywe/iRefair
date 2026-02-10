import SwiftUI

struct StatusBanner: View {
    enum Style {
        case success
        case error
        case warning
        case info

        var tint: Color {
            switch self {
            case .success: return Theme.success.opacity(0.14)
            case .error: return Theme.error.opacity(0.14)
            case .warning: return Theme.warning.opacity(0.18)
            case .info: return Theme.info.opacity(0.12)
            }
        }

        var foreground: Color {
            switch self {
            case .success: return Theme.success
            case .error: return Theme.error
            case .warning: return Theme.warning
            case .info: return Theme.info
            }
        }

        var systemImage: String {
            switch self {
            case .success: return "checkmark.circle.fill"
            case .error: return "exclamationmark.triangle.fill"
            case .warning: return "wifi.slash"
            case .info: return "info.circle.fill"
            }
        }
    }

    let text: String
    let style: Style

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: style.systemImage)
                .foregroundStyle(style.foreground)
            Text(text)
                .foregroundStyle(Theme.ink)
                .font(Theme.font(.subheadline))
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(style.tint)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Theme.glassGradient)
                        .opacity(0.6)
                )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(style.foreground.opacity(0.25), lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
    }
}

enum SubmissionSuccessVariant {
    case `default`
    case confirmationLink
    case confirmationLinkRecent
    case referrerNew
    case referrerExisting
    case referrerNewCompany
}

struct SubmissionSuccessPresentation: View {
    @Binding var isPresented: Bool
    let variant: SubmissionSuccessVariant
    var email: String? = nil

    @State private var confettiTrigger = 0

    var body: some View {
        ZStack {
            SuccessConfettiOverlay(trigger: confettiTrigger)
            SubmissionSuccessModal(isPresented: $isPresented, variant: variant, email: email)
        }
        .onChange(of: isPresented) { visible in
            if visible {
                confettiTrigger += 1
            }
        }
    }
}

private struct SubmissionSuccessModal: View {
    @Binding var isPresented: Bool
    let variant: SubmissionSuccessVariant
    let email: String?

    var body: some View {
        if isPresented {
            ZStack {
                Color.black.opacity(0.48)
                    .ignoresSafeArea()
                    .onTapGesture {
                        dismiss()
                    }

                VStack(spacing: 18) {
                    SuccessCheckmarkBadge()
                        .padding(.top, 6)

                    Text(l("Submission Received!"))
                        .font(Theme.font(size: 26, weight: .bold))
                        .foregroundStyle(Theme.ink)
                        .multilineTextAlignment(.center)

                    Text(confirmationMessage)
                        .font(Theme.font(size: 15, weight: .medium))
                        .foregroundStyle(Theme.ink.opacity(0.9))
                        .multilineTextAlignment(.center)
                        .lineSpacing(3)

                    helperBox

                    Button(l("Got it")) {
                        dismiss()
                    }
                    .buttonStyle(IRefairPrimaryButtonStyle(fillWidth: true))
                    .padding(.top, 2)
                }
                .padding(24)
                .frame(maxWidth: 430)
                .background(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(Color.white.opacity(0.98))
                        .overlay(
                            RoundedRectangle(cornerRadius: 24, style: .continuous)
                                .stroke(Color.white.opacity(0.9), lineWidth: 1)
                        )
                        .shadow(color: Color.black.opacity(0.26), radius: 24, x: 0, y: 18)
                )
                .padding(.horizontal, 20)
                .transition(.asymmetric(insertion: .opacity.combined(with: .scale(scale: 0.95)), removal: .opacity))
            }
            .zIndex(999)
        }
    }

    private var helperBox: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "envelope.fill")
                    .foregroundStyle(Theme.accentPrimary)
                    .font(.system(size: 14, weight: .semibold))
                Text(l("Can't find it?"))
                    .font(Theme.font(size: 14, weight: .bold))
                    .foregroundStyle(Theme.ink)
            }

            VStack(alignment: .leading, spacing: 8) {
                helperBullet(l("Check your Spam or Junk folder"))
                helperBullet(l("If you find it there, mark it as \"Not Spam\" to receive future emails from us"))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color(hex: 0xEAF2FF))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Theme.accentPrimary.opacity(0.18), lineWidth: 1)
                )
        )
    }

    private func helperBullet(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Circle()
                .fill(Theme.accentPrimary.opacity(0.8))
                .frame(width: 5, height: 5)
                .padding(.top, 6)
            Text(text)
                .font(Theme.font(size: 13))
                .foregroundStyle(Theme.ink.opacity(0.9))
                .lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var confirmationMessage: String {
        let normalizedEmail = normalized(email)

        switch variant {
        case .confirmationLinkRecent:
            let base = normalizedEmail.map { String.localizedStringWithFormat(l("We already sent a confirmation link recently to %@."), $0) }
                ?? l("We already sent a confirmation link recently.")
            return "\(base) \(l("Please use the latest email we already sent."))"
        case .confirmationLink:
            return normalizedEmail.map { String.localizedStringWithFormat(l("We've sent the latest confirmation link to %@."), $0) }
                ?? l("We've sent the latest confirmation link to your inbox.")
        case .referrerNew:
            return l("You're all set! Check your email for what to expect next.")
        case .referrerExisting:
            return l("We found your existing account and sent you an email with the details. Our team will review any changes you submitted.")
        case .referrerNewCompany:
            return l("We've added a new company to your account and sent you an email with the details. It's pending approval.")
        case .default:
            return normalizedEmail.map { String.localizedStringWithFormat(l("We've sent a confirmation email to %@."), $0) }
                ?? l("We've sent a confirmation email to your inbox.")
        }
    }

    private func normalized(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private func dismiss() {
        withAnimation(.spring(response: 0.25, dampingFraction: 0.9)) {
            isPresented = false
        }
    }

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }
}

private struct SuccessCheckmarkBadge: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var ringProgress: CGFloat = 0
    @State private var checkProgress: CGFloat = 0
    @State private var iconScale: CGFloat = 0.92

    var body: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        gradient: Gradient(colors: [Color(hex: 0x3D8BFD), Color(hex: 0x7AD7E3)]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 92, height: 92)
                .overlay(
                    Circle()
                        .stroke(Color.white.opacity(0.4), lineWidth: 2)
                )
                .shadow(color: Theme.accentPrimary.opacity(0.35), radius: 12, x: 0, y: 8)

            Circle()
                .trim(from: 0, to: ringProgress)
                .stroke(
                    LinearGradient(
                        gradient: Gradient(colors: [Color.white.opacity(0.95), Color.white.opacity(0.4)]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    style: StrokeStyle(lineWidth: 2.6, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .frame(width: 78, height: 78)

            CheckmarkShape()
                .trim(from: 0, to: checkProgress)
                .stroke(
                    Color.white,
                    style: StrokeStyle(lineWidth: 4.4, lineCap: .round, lineJoin: .round)
                )
                .frame(width: 34, height: 24)
        }
        .scaleEffect(iconScale)
        .onAppear {
            ringProgress = 0
            checkProgress = 0
            iconScale = reduceMotion ? 1 : 0.92

            withAnimation(.easeOut(duration: reduceMotion ? 0.01 : 0.38)) {
                ringProgress = 1
                iconScale = 1
            }
            withAnimation(.easeOut(duration: reduceMotion ? 0.01 : 0.34).delay(reduceMotion ? 0 : 0.12)) {
                checkProgress = 1
            }
        }
    }
}

private struct CheckmarkShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX + rect.width * 0.08, y: rect.minY + rect.height * 0.52))
        path.addLine(to: CGPoint(x: rect.minX + rect.width * 0.42, y: rect.maxY - rect.height * 0.1))
        path.addLine(to: CGPoint(x: rect.maxX - rect.width * 0.06, y: rect.minY + rect.height * 0.12))
        return path
    }
}

private struct SuccessConfettiOverlay: View {
    let trigger: Int
    var duration: TimeInterval = 3.0
    var particleCount: Int = 50
    var spread: Double = 120
    var origin: UnitPoint = UnitPoint(x: 0.5, y: 0.4)

    @State private var pieces: [ConfettiPiece] = []
    @State private var startDate = Date.distantPast
    @State private var lastTrigger = 0

    var body: some View {
        GeometryReader { proxy in
            TimelineView(.animation(minimumInterval: 1.0 / 60.0)) { timeline in
                let elapsed = timeline.date.timeIntervalSince(startDate)

                if !pieces.isEmpty && elapsed < duration {
                    ZStack {
                        ForEach(pieces) { piece in
                            let state = particleState(for: piece, elapsed: elapsed, size: proxy.size)
                            particleBody(for: piece)
                                .position(x: state.x, y: state.y)
                                .rotationEffect(.degrees(state.rotation))
                                .scaleEffect(piece.scale)
                                .opacity(state.opacity)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .onAppear {
                lastTrigger = trigger
                if trigger > 0 {
                    startBurst(in: proxy.size)
                }
            }
            .onChange(of: trigger) { newValue in
                guard newValue != lastTrigger else { return }
                lastTrigger = newValue
                startBurst(in: proxy.size)
            }
        }
        .allowsHitTesting(false)
        .ignoresSafeArea()
        .zIndex(998)
    }

    private func startBurst(in size: CGSize) {
        guard size.width > 0, size.height > 0 else { return }

        let originX = size.width * origin.x
        let originY = size.height * origin.y

        pieces = (0..<particleCount).map { index in
            let angle = Double.random(in: -spread / 2 ... spread / 2) * .pi / 180
            let velocity = CGFloat.random(in: 8 ... 16)
            let direction: CGFloat = Bool.random() ? 1 : -1

            return ConfettiPiece(
                id: index,
                x: originX,
                y: originY,
                rotation: Double.random(in: 0 ... 360),
                scale: CGFloat.random(in: 0.6 ... 1.2),
                color: Self.colors.randomElement() ?? Theme.accentPrimary,
                velocityX: CGFloat(sin(angle)) * velocity * direction,
                velocityY: -CGFloat(cos(angle)) * velocity - CGFloat.random(in: 0 ... 4),
                rotationSpeed: Double.random(in: -10 ... 10),
                shape: ConfettiShape.allCases.randomElement() ?? .square
            )
        }
        startDate = Date()
    }

    private func particleState(for piece: ConfettiPiece, elapsed: TimeInterval, size: CGSize) -> ParticleState {
        let gravity: CGFloat = 0.3
        let friction: CGFloat = 0.99
        let frames = CGFloat(elapsed * 60)

        let x = piece.x + piece.velocityX * frames * friction
        let y = piece.y + piece.velocityY * frames + 0.5 * gravity * frames * frames
        let rotation = piece.rotation + piece.rotationSpeed * elapsed * 60
        let opacity = max(0, 1 - (elapsed / 2.5))

        return ParticleState(
            x: min(max(x, -24), size.width + 24),
            y: min(max(y, -24), size.height + 24),
            rotation: rotation,
            opacity: opacity
        )
    }

    @ViewBuilder
    private func particleBody(for piece: ConfettiPiece) -> some View {
        switch piece.shape {
        case .square:
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(piece.color)
                .frame(width: 10, height: 10)
        case .circle:
            Circle()
                .fill(piece.color)
                .frame(width: 8, height: 8)
        case .strip:
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(piece.color)
                .frame(width: 4, height: 14)
        }
    }

    private static let colors: [Color] = [
        Color(hex: 0x3D8BFD),
        Color(hex: 0x7AD7E3),
        Color(hex: 0xF47C5D),
        Color(hex: 0xFFD166),
        Color(hex: 0xA78BFA),
        Color(hex: 0x34D399),
    ]
}

private enum ConfettiShape: CaseIterable {
    case square
    case circle
    case strip
}

private struct ConfettiPiece: Identifiable {
    let id: Int
    let x: CGFloat
    let y: CGFloat
    let rotation: Double
    let scale: CGFloat
    let color: Color
    let velocityX: CGFloat
    let velocityY: CGFloat
    let rotationSpeed: Double
    let shape: ConfettiShape
}

private struct ParticleState {
    let x: CGFloat
    let y: CGFloat
    let rotation: Double
    let opacity: Double
}
