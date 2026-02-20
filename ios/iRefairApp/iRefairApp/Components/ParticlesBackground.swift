import SwiftUI

struct ParticlesBackground: View {
    struct ParticleSeed {
        let origin: CGPoint
        let velocity: CGVector
        let size: CGFloat
        let color: Color
    }

    let size: CGSize

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var particles: [ParticleSeed] = []
    @State private var startTime = Date()
    @State private var pausedElapsed: TimeInterval = 0
    @State private var lastSize: CGSize = .zero
    @State private var isActive = false

    private let particleColors: [Color] = [
        Color(red: 122.0 / 255.0, green: 215.0 / 255.0, blue: 227.0 / 255.0, opacity: 0.55),
        Color(red: 59.0 / 255.0, green: 159.0 / 255.0, blue: 175.0 / 255.0, opacity: 0.55),
        Color(red: 199.0 / 255.0, green: 240.0 / 255.0, blue: 255.0 / 255.0, opacity: 0.55),
    ]
    private let linkColorBase = (red: CGFloat(122.0 / 255.0), green: CGFloat(215.0 / 255.0), blue: CGFloat(227.0 / 255.0))
    private let maxSpeed: CGFloat = 0.35 * 60.0
    private let minSpeed: CGFloat = 0.05 * 60.0

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 60.0, paused: reduceMotion || !isActive)) { timeline in
            Canvas { context, canvasSize in
                guard !particles.isEmpty else { return }

                let isSmallScreen = canvasSize.width < 720
                let maxDistance: CGFloat = isSmallScreen ? 82 : 120
                // Keep links subtle on compact screens instead of disabling them entirely.
                let linkOpacityBase: CGFloat = reduceMotion ? 0 : (isSmallScreen ? 0.12 : 0.2)
                let elapsed = (reduceMotion || !isActive) ? pausedElapsed : timeline.date.timeIntervalSince(startTime)

                var positions: [CGPoint] = []
                positions.reserveCapacity(particles.count)

                for particle in particles {
                    let x = reflected(particle.origin.x + particle.velocity.dx * CGFloat(elapsed), max: canvasSize.width)
                    let y = reflected(particle.origin.y + particle.velocity.dy * CGFloat(elapsed), max: canvasSize.height)
                    positions.append(CGPoint(x: x, y: y))
                }

                if linkOpacityBase > 0 {
                    for i in 0..<positions.count {
                        let current = positions[i]
                        for j in (i + 1)..<positions.count {
                            let neighbor = positions[j]
                            let dx = current.x - neighbor.x
                            let dy = current.y - neighbor.y
                            let distance = sqrt(dx * dx + dy * dy)
                            if distance < maxDistance {
                                let opacity = linkOpacityBase * (1 - distance / maxDistance)
                                var path = Path()
                                path.move(to: current)
                                path.addLine(to: neighbor)
                                let strokeColor = Color(red: linkColorBase.red, green: linkColorBase.green, blue: linkColorBase.blue, opacity: opacity)
                                context.stroke(path, with: .color(strokeColor), lineWidth: 1)
                            }
                        }
                    }
                }

                for (index, particle) in particles.enumerated() {
                    let position = positions[index]
                    let halfSize = particle.size / 2
                    let rect = CGRect(x: position.x - halfSize, y: position.y - halfSize, width: particle.size, height: particle.size)
                    context.fill(Path(rect), with: .color(particle.color))
                }
            }
        }
        .opacity(0.7)
        .allowsHitTesting(false)
        .onAppear {
            isActive = true
            resumeAnimation()
            configureParticles(for: size)
        }
        .onDisappear {
            pauseAnimation()
            isActive = false
        }
        .onChange(of: size) { newSize in
            configureParticles(for: newSize)
        }
        .onChange(of: reduceMotion) { _ in
            if reduceMotion || !isActive {
                pauseAnimation()
            } else {
                resumeAnimation()
            }
        }
    }

    private func configureParticles(for size: CGSize) {
        guard size.width > 0, size.height > 0 else { return }
        if lastSize == size && !particles.isEmpty { return }

        let isSmallScreen = size.width < 720
        let count = isSmallScreen ? 20 : 60
        var nextParticles: [ParticleSeed] = []
        nextParticles.reserveCapacity(count)

        for _ in 0..<count {
            let origin = CGPoint(x: CGFloat.random(in: 0...size.width), y: CGFloat.random(in: 0...size.height))
            let velocity = CGVector(dx: randomVelocity(), dy: randomVelocity())
            let particleSize = CGFloat.random(in: 1.4...4.0)
            let color = particleColors.randomElement() ?? particleColors[0]
            nextParticles.append(ParticleSeed(origin: origin, velocity: velocity, size: particleSize, color: color))
        }

        particles = nextParticles
        lastSize = size
        startTime = Date()
        pausedElapsed = 0
    }

    private func randomVelocity() -> CGFloat {
        var velocity = CGFloat.random(in: -maxSpeed...maxSpeed)
        if abs(velocity) < minSpeed {
            velocity = (velocity < 0 ? -1 : 1) * minSpeed
        }
        return velocity
    }

    private func reflected(_ value: CGFloat, max: CGFloat) -> CGFloat {
        guard max > 0 else { return 0 }
        let period = max * 2
        var v = value.truncatingRemainder(dividingBy: period)
        if v < 0 {
            v += period
        }
        return v <= max ? v : (period - v)
    }

    private func pauseAnimation() {
        pausedElapsed = Date().timeIntervalSince(startTime)
    }

    private func resumeAnimation() {
        startTime = Date().addingTimeInterval(-pausedElapsed)
    }
}
