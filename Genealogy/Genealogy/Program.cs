using Genealogy.Data;
using Genealogy.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

var logFilePath = Path.Combine(
    builder.Environment.ContentRootPath,
    "logs",
    "genealogy-.log");
builder.Host.UseSerilog((_, loggerConfiguration) =>
    loggerConfiguration
        .MinimumLevel.Information()
        .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.File(
            logFilePath,
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 14,
            shared: true,
            outputTemplate:
                "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}"));

var sqliteConnection = new SqliteConnectionStringBuilder(
    builder.Configuration.GetConnectionString("genealogy")
    ?? throw new InvalidOperationException("The genealogy connection string is missing."));
if (sqliteConnection.DataSource != ":memory:" &&
    !Path.IsPathRooted(sqliteConnection.DataSource))
{
    sqliteConnection.DataSource = Path.Combine(
        builder.Environment.ContentRootPath,
        sqliteConnection.DataSource);
}

var databaseDirectory = Path.GetDirectoryName(sqliteConnection.DataSource);
if (!string.IsNullOrEmpty(databaseDirectory))
{
    Directory.CreateDirectory(databaseDirectory);
}

builder.Services.AddDbContext<GenealogyContext>(options =>
    options.UseSqlite(sqliteConnection.ToString()));

builder.Services.AddScoped<IGenealogyService, GenealogyService>();
builder.Services.AddScoped<GenealogyDatabaseInitializer>();

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(o => o.AddPolicy("angular", p =>
    p.WithOrigins("http://localhost:4200").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<GenealogyDatabaseInitializer>();
    await initializer.InitializeAsync();
}

// Configure the HTTP request pipeline.
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthorization();
app.UseCors("angular");
app.MapControllers();

app.Run();
