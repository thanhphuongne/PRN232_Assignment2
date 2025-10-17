using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Web;

namespace ECommerceAPI;

public class VnPayLibrary
{
    public const string VERSION = "2.1.0";

    private readonly SortedList<string, string> _requestData = new();
    private readonly SortedList<string, string> _responseData = new();

    public void AddRequestData(string key, string value)
    {
        if (!string.IsNullOrEmpty(value))
        {
            _requestData[key] = value;
        }
    }

    public void AddResponseData(string key, string value)
    {
        if (!string.IsNullOrEmpty(value))
        {
            _responseData[key] = value;
        }
    }

    public string GetResponseData(string key)
    {
        return _responseData.TryGetValue(key, out var value) ? value : string.Empty;
    }

    public string CreateRequestUrl(string baseUrl, string vnp_HashSecret)
    {
        // Build query string from sorted parameters with URL encoding
        var data = string.Join("&", _requestData.OrderBy(kvp => kvp.Key).Select(kvp => $"{kvp.Key}={HttpUtility.UrlEncode(kvp.Value)}"));
        var querystring = data;

        // Generate signature using SHA256 (matching sample code)
        var vnp_SecureHash = HmacSHA256(vnp_HashSecret, data);
        querystring += $"&vnp_SecureHash={vnp_SecureHash}";

        return $"{baseUrl}?{querystring}";
    }

    public bool ValidateSignature(string inputHash, string secretKey)
    {
        var rspRaw = GetResponseData();
        var myChecksum = HmacSHA512(secretKey, rspRaw);
        return myChecksum.Equals(inputHash, StringComparison.InvariantCultureIgnoreCase);
    }

    private string GetResponseData()
    {
        var data = string.Join("&", _responseData
            .Where(kvp => !string.IsNullOrEmpty(kvp.Key) && kvp.Key != "vnp_SecureHash" && kvp.Key != "vnp_SecureHashType")
            .OrderBy(kvp => kvp.Key)
            .Select(kvp => $"{kvp.Key}={kvp.Value}"));

        return data;
    }

    private string HmacSHA256(string key, string inputData)
    {
        var hash = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var hashBytes = hash.ComputeHash(Encoding.UTF8.GetBytes(inputData));
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
    }

    private string HmacSHA512(string key, string inputData)
    {
        var hash = new HMACSHA512(Encoding.UTF8.GetBytes(key));
        var hashBytes = hash.ComputeHash(Encoding.UTF8.GetBytes(inputData));
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
    }
}

public class Utils
{
    public static string GetIpAddress(Microsoft.AspNetCore.Http.HttpContext context)
    {
        // Try X-Forwarded-For header first (for proxies/load balancers)
        var ipAddress = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(ipAddress))
        {
            // X-Forwarded-For can contain multiple IPs, take the first one
            ipAddress = ipAddress.Split(',')[0].Trim();
        }

        // If X-Forwarded-For is not available, try X-Real-IP
        if (string.IsNullOrEmpty(ipAddress))
        {
            ipAddress = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        }

        // Fallback to RemoteIpAddress
        if (string.IsNullOrEmpty(ipAddress))
        {
            ipAddress = context.Connection.RemoteIpAddress?.ToString();
        }

        // Handle IPv4-mapped IPv6 addresses
        if (!string.IsNullOrEmpty(ipAddress) && ipAddress.StartsWith("::ffff:"))
        {
            ipAddress = ipAddress.Substring(7);
        }

        // Final fallback
        return ipAddress ?? "127.0.0.1";
    }
}

public class OrderInfo
{
    public long OrderId { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string OrderDesc { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
}