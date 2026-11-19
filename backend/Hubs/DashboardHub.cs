using Microsoft.AspNetCore.SignalR;

namespace Backend.Hubs;

/// <summary>
/// Canal em tempo real usado para enviar atualizações MQTT ao frontend.
/// </summary>
public sealed class DashboardHub : Hub;
