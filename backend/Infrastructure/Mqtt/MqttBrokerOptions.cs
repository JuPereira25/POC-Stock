namespace Backend.Infrastructure.Mqtt;

public sealed class MqttBrokerOptions
{
    public const string SectionName = "MqttBroker";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 1883;
    public string Topic01 { get; set; } = string.Empty;
    public string Topic02 { get; set; } = string.Empty;
    public string Topic03 { get; set; } = string.Empty;

    public IEnumerable<string> SubscribeTopics =>
        new[] { Topic01, Topic02, Topic03 }
            .Where(topic => !string.IsNullOrWhiteSpace(topic));
}
