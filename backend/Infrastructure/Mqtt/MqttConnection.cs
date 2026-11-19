using Microsoft.Extensions.Options;
using MQTTnet;

namespace Backend.Infrastructure.Mqtt;

/// <summary>
/// Mantém a conexão com o broker MQTT e tenta reconectar após uma queda.
/// </summary>
public sealed class MqttConnection : IDisposable
{
    private readonly IMqttClient _client;
    private readonly MqttClientOptions _clientOptions;
    private readonly ILogger<MqttConnection> _logger;
    private readonly TimeSpan _reconnectInterval = TimeSpan.FromSeconds(5);
    private Timer? _reconnectTimer;
    private bool _disposed;

    public MqttConnection(
        IOptions<MqttBrokerOptions> options,
        ILogger<MqttConnection> logger)
    {
        var broker = options.Value;
        _logger = logger;

        _client = new MqttClientFactory().CreateMqttClient();
        _clientOptions = new MqttClientOptionsBuilder()
            .WithTcpServer(broker.Host, broker.Port)
            .WithClientId($"EstoqueApi_{Guid.NewGuid():N}")
            .WithCleanSession()
            .Build();

        _client.DisconnectedAsync += OnDisconnectedAsync;
    }

    public event Func<Task>? Connected;
    public IMqttClient Client => _client;
    public bool IsConnected => _client.IsConnected;

    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await _client.ConnectAsync(_clientOptions, cancellationToken);
            await NotifyConnectedAsync();
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Não foi possível conectar ao broker MQTT.");
            ScheduleReconnect();
        }
    }

    private Task OnDisconnectedAsync(MqttClientDisconnectedEventArgs _)
    {
        _logger.LogWarning("Cliente desconectado do broker MQTT.");
        ScheduleReconnect();
        return Task.CompletedTask;
    }

    private void ScheduleReconnect()
    {
        if (_disposed)
        {
            return;
        }

        _reconnectTimer?.Dispose();
        _reconnectTimer = new Timer(
            async _ => await TryReconnectAsync(),
            null,
            _reconnectInterval,
            Timeout.InfiniteTimeSpan);
    }

    private async Task TryReconnectAsync()
    {
        if (_disposed || _client.IsConnected)
        {
            return;
        }

        try
        {
            await _client.ConnectAsync(_clientOptions);
            await NotifyConnectedAsync();
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Nova tentativa de conexão MQTT falhou.");
            ScheduleReconnect();
        }
    }

    private async Task NotifyConnectedAsync()
    {
        if (!_client.IsConnected)
        {
            return;
        }

        _reconnectTimer?.Dispose();
        _reconnectTimer = null;

        if (Connected is not null)
        {
            await Connected.Invoke();
        }
    }

    public void Dispose()
    {
        _disposed = true;
        _reconnectTimer?.Dispose();
        _client.DisconnectedAsync -= OnDisconnectedAsync;
        _client.Dispose();
    }
}
