using Backend.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Infrastructure.Mqtt;

/// <summary>
/// Encaminha cada mensagem MQTT ao frontend, identificando o posto pelo tópico.
/// </summary>
public sealed class MqttHostedService : IHostedService
{
    private const string StockAlertCommand = "ATENÇÃO ESTOQUE";

    private readonly MqttConnection _connection;
    private readonly MqttSubscriber _subscriber;
    private readonly IHubContext<DashboardHub> _hub;
    private readonly ILogger<MqttHostedService> _logger;

    public MqttHostedService(
        MqttConnection connection,
        MqttSubscriber subscriber,
        IHubContext<DashboardHub> hub,
        ILogger<MqttHostedService> logger)
    {
        _connection = connection;
        _subscriber = subscriber;
        _hub = hub;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _subscriber.MessageReceived += OnMessageReceived;
        _ = ConnectInBackgroundAsync(cancellationToken);
        return Task.CompletedTask;
    }

    private async Task ConnectInBackgroundAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _connection.ConnectAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Encerramento normal da aplicação.
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Falha inesperada ao iniciar a conexão MQTT.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _subscriber.MessageReceived -= OnMessageReceived;
        return Task.CompletedTask;
    }

    private void OnMessageReceived(string topic, string payload)
    {
        _logger.LogInformation("Mensagem MQTT em {Topic}: {Payload}", topic, payload);

        if (!string.Equals(
                payload.Trim(),
                StockAlertCommand,
                StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogDebug(
                "Mensagem MQTT ignorada porque não corresponde ao comando {Command}.",
                StockAlertCommand);
            return;
        }

        var alert = new
        {
            Station = GetStationFromTopic(topic),
            Topic = topic,
            Payload = payload
        };

        _ = SendAlertAsync(alert);
    }

    private async Task SendAlertAsync(object alert)
    {
        try
        {
            await _hub.Clients.All.SendAsync("StockAlertReceived", alert);
            _logger.LogInformation("Evento SignalR StockAlertReceived enviado.");
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Falha ao enviar alerta pelo SignalR.");
        }
    }

    private static string GetStationFromTopic(string topic)
    {
        var station = topic
            .Split('/', StringSplitOptions.RemoveEmptyEntries)
            .LastOrDefault() ?? topic;

        var numberStart = station.IndexOfAny("0123456789".ToCharArray());
        if (numberStart > 0 && !char.IsWhiteSpace(station[numberStart - 1]))
        {
            station = station.Insert(numberStart, " ");
        }

        return station;
    }
}
