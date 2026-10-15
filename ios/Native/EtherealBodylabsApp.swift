import SwiftUI

@main
struct EtherealBodylabsApp: App {
    var body: some Scene {
        WindowGroup {
            EtherealRootView()
                .preferredColorScheme(.light)
        }
    }
}

struct EtherealRootView: View {
    var body: some View {
        TabView {
            TodayScreen()
                .tabItem { Label("Today", systemImage: "sun.max") }
            SimpleSection(title: "Workouts", subtitle: "Training that fits your life.", symbol: "figure.run")
                .tabItem { Label("Workouts", systemImage: "figure.run") }
            SimpleSection(title: "Nutrition", subtitle: "Build balanced, sustainable habits.", symbol: "leaf")
                .tabItem { Label("Nutrition", systemImage: "leaf") }
            SimpleSection(title: "Physique", subtitle: "Track progress over time.", symbol: "chart.xyaxis.line")
                .tabItem { Label("Physique", systemImage: "chart.xyaxis.line") }
            SimpleSection(title: "Profile", subtitle: "Your goals, preferences, and account.", symbol: "person.crop.circle")
                .tabItem { Label("Profile", systemImage: "person.crop.circle") }
        }
        .tint(Color(red: 0.38, green: 0.32, blue: 0.56))
    }
}

private struct TodayScreen: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(Date.now.formatted(.dateTime.weekday(.wide).month(.wide).day()).uppercased())
                            .font(.caption.weight(.semibold)).tracking(1.5)
                            .foregroundStyle(.secondary)
                        Text("Your day, in balance.")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                        Text("Small, consistent steps add up.")
                            .foregroundStyle(.secondary)
                    }
                    HStack(spacing: 12) {
                        MetricTile(title: "Movement", value: "0 min", icon: "figure.walk")
                        MetricTile(title: "Hydration", value: "0 / 8", icon: "drop")
                    }
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Your focus").font(.title3.bold())
                        FocusTile(icon: "figure.strengthtraining.traditional", title: "Move with intention", detail: "Choose movement that feels right today.")
                        FocusTile(icon: "leaf", title: "Fuel your body", detail: "Make room for balanced meals.")
                        FocusTile(icon: "moon.zzz", title: "Recover well", detail: "Rest is part of the process.")
                    }
                    .padding(18)
                    .background(.white, in: RoundedRectangle(cornerRadius: 24))
                }
                .padding(20)
            }
            .background(Color(red: 0.97, green: 0.96, blue: 0.95))
            .navigationTitle("ETHEREAL")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

private struct MetricTile: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Image(systemName: icon).font(.title3).foregroundStyle(.purple)
            Text(title).font(.subheadline).foregroundStyle(.secondary)
            Text(value).font(.title2.bold())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(.white, in: RoundedRectangle(cornerRadius: 22))
    }
}

private struct FocusTile: View {
    let icon: String
    let title: String
    let detail: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3).foregroundStyle(.purple)
                .frame(width: 44, height: 44)
                .background(.purple.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.subheadline.bold())
                Text(detail).font(.caption).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
    }
}

private struct SimpleSection: View {
    let title: String
    let subtitle: String
    let symbol: String

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 18) {
                Image(systemName: symbol).font(.system(size: 38)).foregroundStyle(.purple)
                    .frame(width: 76, height: 76)
                    .background(.purple.opacity(0.08), in: RoundedRectangle(cornerRadius: 22))
                Text(title).font(.system(size: 30, weight: .bold, design: .rounded))
                Text(subtitle).foregroundStyle(.secondary)
                Text("Connect this screen to the production Ethereal Bodylabs backend before release.")
                    .font(.footnote).foregroundStyle(.tertiary)
                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
            .background(Color(red: 0.97, green: 0.96, blue: 0.95))
            .navigationTitle(title)
        }
    }
}
