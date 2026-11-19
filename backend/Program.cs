using Backend.Hubs;
using Backend.Infrastructure.Database;
using Backend.Infrastructure.Mqtt;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// O Event Log do Windows exige privilégios administrativos em algumas máquinas.
// Console/Debug mantêm os logs disponíveis sem impedir a inicialização da API.
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSignalR();

builder.Services.AddDbContext<StockDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("PostgreSql"),
        npgsql => npgsql.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null)));

builder.Services.Configure<MqttBrokerOptions>(
    builder.Configuration.GetSection(MqttBrokerOptions.SectionName));
builder.Services.AddSingleton(
    serviceProvider => serviceProvider
        .GetRequiredService<IOptions<MqttBrokerOptions>>()
        .Value);
builder.Services.AddSingleton<MqttConnection>();
builder.Services.AddSingleton<MqttSubscriber>();
builder.Services.AddHostedService<MqttHostedService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy
            .SetIsOriginAllowed(origin =>
                origin == "http://localhost:5173" ||
                origin == "http://localhost:5174" ||
                origin == "null")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.MapControllers();
app.MapHub<DashboardHub>("/hubs/dashboard");
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

await app.RunAsync();
