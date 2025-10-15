# Use the official .NET 8.0 SDK image to build the application
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the project file and restore dependencies
COPY ["ECommerceAPI.csproj", "./"]
RUN dotnet restore "ECommerceAPI.csproj"

# Copy the entire source code
COPY . .

# Build the application
RUN dotnet build "ECommerceAPI.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "ECommerceAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Use the official ASP.NET Core runtime image to run the application
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Create a non-root user for security
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser:appuser /app
USER appuser

# Copy the published application from the build stage
COPY --from=publish /app/publish .

# Expose the port the application runs on
EXPOSE 8080

# Set the ASP.NET Core environment to Production
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080

# Set the entry point for the container
ENTRYPOINT ["dotnet", "ECommerceAPI.dll"]