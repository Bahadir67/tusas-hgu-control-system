using TUSAS.HGU.Core.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Configure CORS for frontend access
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowTauriApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:3000", "http://localhost:5173", "tauri://localhost")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// Add OPC UA configuration
builder.Services.AddSingleton<OpcUaConfig>(provider =>
{
    var config = new OpcUaConfig
    {
        EndpointUrl = builder.Configuration["OpcUa:EndpointUrl"] ?? "opc.tcp://192.168.100.10:4840",
        SecurityPolicy = "None",
        SecurityMode = "None",
        AutoAcceptUntrustedCertificates = true,
        EnableReconnection = true,
        ReconnectionDelaySeconds = 5,
        DataCollectionIntervalSeconds = 2,
        DatabaseBlockName = "DB_HGU_Execution",
        NamespaceIndex = 2,
        UseAuthentication = builder.Configuration.GetValue<bool>("OpcUa:UseAuthentication"),
        Username = builder.Configuration["OpcUa:Username"] ?? "",
        Password = builder.Configuration["OpcUa:Password"] ?? ""
    };
    return config;
});

// Add OPC UA Client as Singleton
builder.Services.AddSingleton<WorkstationOpcUaClient>();

// OpcService kaldırıldı - sadece WorkstationOpcUaClient kullanılacak

// Add InfluxDB Service
builder.Services.AddSingleton<InfluxDbService>(provider =>
{
    var config = builder.Configuration;
    var influxService = new InfluxDbService(
        config["InfluxDB:Url"] ?? "http://localhost:8086",
        config["InfluxDB:Token"] ?? "vDyMTLnK9Ze12qzvugZmMmt7-z6ygg6btQl1wPjOCX9B51vmK5NxV2Ys-2dByV8KMo6ntgmuAI0VEClZow295w==",
        config["InfluxDB:Organization"] ?? "34c60c1a89df9a26",
        config["InfluxDB:Bucket"] ?? "tusas_hgu"
    );
    
    // Connect OPC and InfluxDB services
    var opcClient = provider.GetRequiredService<WorkstationOpcUaClient>();
    influxService.SetOpcUaClient(opcClient);
    opcClient.SetInfluxDbService(influxService);
    
    return influxService;
});

// Add Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowTauriApp");
app.UseHttpsRedirection();
app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => new
{
    Status = "Healthy",
    Timestamp = DateTime.Now,
    Service = "TUSAS HGU API"
});

// Initialize OPC UA connection on startup
var serviceProvider = app.Services;
var opcClient = serviceProvider.GetRequiredService<WorkstationOpcUaClient>();
var logger = serviceProvider.GetRequiredService<ILogger<Program>>();

logger.LogInformation("🚀 TUSAS HGU API başlatılıyor...");

// Try to connect OPC UA on startup (non-blocking)
_ = Task.Run(async () =>
{
    await Task.Delay(2000); // 2 saniye bekle
    try
    {
        logger.LogInformation("🔌 OPC UA startup connection attempt...");
        var connected = await opcClient.ConnectAsync();
        if (connected)
        {
            logger.LogInformation("✅ OPC UA startup connection successful");
            
            // A1.xml'i parse et ve collection oluştur
            try
            {
                var xmlPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "TUSAS.HGU.Core", "Data", "A1.xml");
                var loggerFactory = LoggerFactory.Create(builder => { });
                var xmlParser = new TUSAS.HGU.Core.Services.OPC.A1XmlParser(loggerFactory.CreateLogger<TUSAS.HGU.Core.Services.OPC.A1XmlParser>());
                
                var collection = xmlParser.ParseA1Xml(xmlPath);
                logger.LogInformation("✅ A1.xml parsing bitti, {Count} değişken", collection?.Count ?? 0);
                if (collection != null && collection.Count > 0)
                {
                    opcClient.SetOpcVariableCollection(collection);
                    logger.LogInformation("✅ OPC Collection setup completed with {Count} variables", collection.Count);
                    
                    // Namespace update yap
                    await opcClient.UpdateCollectionNamespaces();
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "❌ Error setting up OPC collection: {Message}", ex.Message);
            }
        }
        else
        {
            logger.LogWarning("⚠️ OPC UA startup connection failed - will be available via API");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ OPC UA startup connection error: {Message}", ex.Message);
    }
});

logger.LogInformation("🌐 TUSAS HGU API running on {Urls}", string.Join(", ", app.Urls));

app.Run();