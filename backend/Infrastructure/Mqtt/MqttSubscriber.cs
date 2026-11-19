using MQTTnet;

namespace Backend.Infrastructure.Mqtt;

/// <summary>
/// Assina os tópicos configurados e expõe as mensagens recebidas.
/// </summary>
public sealed class MqttSubscriber
{
    private readonly MqttConnection _connection;
    private readonly MqttBrokerOptions _options;
    private readonly ILogger<MqttSubscriber> _logger;

    public MqttSubscriber(
        MqttConnection connection,
        MqttBrokerOptions options,
        ILogger<MqttSubscriber> logger)
    {
        _connection = connection;
        _options = options;
        _logger = logger;

        _connection.Client.ApplicationMessageReceivedAsync += OnMessageReceivedAsync;
        _connection.Connected += SubscribeAsync;
    }

    public event Action<string, string>? MessageReceived;

    private async Task SubscribeAsync()
    {
        try
        {
            foreach (var topic in _options.SubscribeTopics)
            {
                await _connection.Client.SubscribeAsync(topic);
                _logger.LogInformation("Inscrito no tópico MQTT {Topic}.", topic);
            }
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Falha ao assinar tópicos MQTT.");
        }
    }

    private Task OnMessageReceivedAsync(MqttApplicationMessageReceivedEventArgs message)
    {
        MessageReceived?.Invoke(
            message.ApplicationMessage.Topic,
            message.ApplicationMessage.ConvertPayloadToString());

        return Task.CompletedTask;
    }
}
