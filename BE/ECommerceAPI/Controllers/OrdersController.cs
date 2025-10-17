using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using ECommerceAPI.Data;
using ECommerceAPI.Models;

namespace ECommerceAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableCors("AllowFrontend")]
public class OrdersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public OrdersController(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    // GET: api/orders
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Order>>> GetUserOrders()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var orders = await _context.Orders
            .Where(o => o.UserId == userId)
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.Product)
            .ToListAsync();

        // Create response DTOs to avoid circular references
        var ordersResponse = orders.Select(order => new
        {
            order.Id,
            order.UserId,
            order.TotalAmount,
            order.Status,
            order.CreatedAt,
            OrderItems = order.OrderItems.Select(oi => new
            {
                oi.Id,
                oi.ProductId,
                oi.Quantity,
                oi.Price,
                Product = new
                {
                    oi.Product.Id,
                    oi.Product.Name,
                    oi.Product.Description,
                    oi.Product.Price,
                    oi.Product.ImageUrl,
                    oi.Product.CreatedAt,
                    oi.Product.UpdatedAt
                }
            }).ToList()
        }).ToList();

        return Ok(ordersResponse);
    }

    // GET: api/orders/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Order>> GetOrder(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.Product)
            .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

        if (order == null)
        {
            return NotFound();
        }

        // Create a response DTO to avoid circular references
        var orderResponse = new
        {
            order.Id,
            order.UserId,
            order.TotalAmount,
            order.Status,
            order.CreatedAt,
            OrderItems = order.OrderItems.Select(oi => new
            {
                oi.Id,
                oi.ProductId,
                oi.Quantity,
                oi.Price,
                Product = new
                {
                    oi.Product.Id,
                    oi.Product.Name,
                    oi.Product.Description,
                    oi.Product.Price,
                    oi.Product.ImageUrl,
                    oi.Product.CreatedAt,
                    oi.Product.UpdatedAt
                }
            }).ToList()
        };

        return Ok(orderResponse);
    }

    // POST: api/orders
    [HttpPost]
    public async Task<ActionResult<Order>> PostOrder(CreateOrderModel model)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        // Validate cart items
        var productIds = model.Items.Select(i => i.ProductId).ToList();
        var products = await _context.Products
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        if (products.Count != productIds.Count)
        {
            return BadRequest("One or more products not found");
        }

        // Calculate total
        decimal totalAmount = 0;
        var orderItems = new List<OrderItem>();

        foreach (var item in model.Items)
        {
            if (!products.TryGetValue(item.ProductId, out var product))
                continue;

            var orderItem = new OrderItem
            {
                ProductId = item.ProductId,
                Product = product,
                Quantity = item.Quantity,
                Price = product.Price
            };

            orderItems.Add(orderItem);
            totalAmount += product.Price * item.Quantity;
        }

        var order = new Order
        {
            UserId = userId,
            TotalAmount = totalAmount,
            Status = "Pending",
            OrderItems = orderItems
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        // Create a response DTO to avoid circular references
        var orderResponse = new
        {
            order.Id,
            order.UserId,
            order.TotalAmount,
            order.Status,
            order.CreatedAt,
            OrderItems = order.OrderItems.Select(oi => new
            {
                oi.Id,
                oi.ProductId,
                oi.Quantity,
                oi.Price,
                Product = new
                {
                    oi.Product.Id,
                    oi.Product.Name,
                    oi.Product.Description,
                    oi.Product.Price,
                    oi.Product.ImageUrl,
                    oi.Product.CreatedAt,
                    oi.Product.UpdatedAt
                }
            }).ToList()
        };

        return CreatedAtAction("GetOrder", new { id = order.Id }, orderResponse);
    }

    // PUT: api/orders/5/status
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] string status)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var order = await _context.Orders.FindAsync(id);
        if (order == null || order.UserId != userId)
        {
            return NotFound();
        }

        order.Status = status;
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // POST: api/orders/{id}/payment
    [HttpPost("{id}/payment")]
    public async Task<IActionResult> CreatePayment(int id, [FromBody] CreatePaymentRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.Product)
            .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

        if (order == null)
        {
            return NotFound("Order not found");
        }

        if (order.PaymentStatus == "Paid")
        {
            return BadRequest("Order is already paid");
        }

        // Get VNPay configuration from environment variables only
        var vnp_TmnCode = Environment.GetEnvironmentVariable("VNP_TMN_CODE") ?? _configuration["VnPay:TmnCode"];
        var vnp_HashSecret = Environment.GetEnvironmentVariable("VNP_HASH_SECRET") ?? _configuration["VnPay:HashSecret"];
        var vnp_Url = Environment.GetEnvironmentVariable("VNP_URL") ?? _configuration["VnPay:Url"];
        var vnp_Returnurl = Environment.GetEnvironmentVariable("VNP_RETURN_URL") ?? _configuration["VnPay:ReturnUrl"];

        if (string.IsNullOrEmpty(vnp_TmnCode) || string.IsNullOrEmpty(vnp_HashSecret) || string.IsNullOrEmpty(vnp_Url) || string.IsNullOrEmpty(vnp_Returnurl))
        {
            return BadRequest("VNPay configuration is missing. Please set VNP_TMN_CODE, VNP_HASH_SECRET, VNP_URL, and VNP_RETURN_URL environment variables");
        }

        // Create payment record
        var payment = new Payment
        {
            OrderId = order.Id,
            TransactionId = DateTime.Now.Ticks.ToString(),
            Amount = order.TotalAmount,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        // Build VNPay URL
        var vnpay = new VnPayLibrary();

        vnpay.AddRequestData("vnp_Version", VnPayLibrary.VERSION);
        vnpay.AddRequestData("vnp_Command", "pay");
        vnpay.AddRequestData("vnp_TmnCode", vnp_TmnCode);
        vnpay.AddRequestData("vnp_Amount", ((long)(order.TotalAmount * 100)).ToString()); // Amount in smallest currency unit
        if (!string.IsNullOrEmpty(request.BankCode))
        {
            vnpay.AddRequestData("vnp_BankCode", request.BankCode);
        }
        vnpay.AddRequestData("vnp_CreateDate", DateTime.Now.ToString("yyyyMMddHHmmss"));
        vnpay.AddRequestData("vnp_CurrCode", "VND");
        vnpay.AddRequestData("vnp_IpAddr", Utils.GetIpAddress(HttpContext));
        if (!string.IsNullOrEmpty(request.Language))
        {
            vnpay.AddRequestData("vnp_Locale", request.Language);
        }
        else
        {
            vnpay.AddRequestData("vnp_Locale", "vn");
        }
        vnpay.AddRequestData("vnp_OrderInfo", $"Thanh toan don hang {order.Id}");
        vnpay.AddRequestData("vnp_OrderType", "other");
        vnpay.AddRequestData("vnp_ReturnUrl", vnp_Returnurl);
        vnpay.AddRequestData("vnp_TxnRef", payment.TransactionId);
        vnpay.AddRequestData("vnp_ExpireDate", DateTime.Now.AddMinutes(15).ToString("yyyyMMddHHmmss"));

        // Add billing info if provided
        if (!string.IsNullOrEmpty(request.BillingFullName))
        {
            var fullName = request.BillingFullName.Trim();
            var indexof = fullName.IndexOf(' ');
            if (indexof > 0)
            {
                vnpay.AddRequestData("vnp_Bill_FirstName", fullName.Substring(0, indexof));
                vnpay.AddRequestData("vnp_Bill_LastName", fullName.Substring(indexof + 1));
            }
            else
            {
                vnpay.AddRequestData("vnp_Bill_FirstName", fullName);
            }
        }

        if (!string.IsNullOrEmpty(request.BillingEmail))
            vnpay.AddRequestData("vnp_Bill_Email", request.BillingEmail);

        if (!string.IsNullOrEmpty(request.BillingMobile))
            vnpay.AddRequestData("vnp_Bill_Mobile", request.BillingMobile);

        if (!string.IsNullOrEmpty(request.BillingAddress))
            vnpay.AddRequestData("vnp_Bill_Address", request.BillingAddress);

        if (!string.IsNullOrEmpty(request.BillingCity))
            vnpay.AddRequestData("vnp_Bill_City", request.BillingCity);

        if (!string.IsNullOrEmpty(request.BillingCountry))
            vnpay.AddRequestData("vnp_Bill_Country", request.BillingCountry);

        var paymentUrl = vnpay.CreateRequestUrl(vnp_Url, vnp_HashSecret);

        return Ok(new { PaymentUrl = paymentUrl, TransactionId = payment.TransactionId });
    }

    // GET: api/orders/payment-return
    [HttpGet("payment-return")]
    [AllowAnonymous]
    public async Task<IActionResult> PaymentReturn([FromQuery] Dictionary<string, string> vnpayData)
    {
        var vnpay = new VnPayLibrary();

        foreach (var kvp in vnpayData)
        {
            vnpay.AddResponseData(kvp.Key, kvp.Value);
        }

        var vnp_HashSecret = Environment.GetEnvironmentVariable("VNP_HASH_SECRET");
        var vnp_SecureHash = vnpayData.GetValueOrDefault("vnp_SecureHash");

        if (vnpay.ValidateSignature(vnp_SecureHash, vnp_HashSecret))
        {
            var transactionId = vnpay.GetResponseData("vnp_TxnRef");
            var responseCode = vnpay.GetResponseData("vnp_ResponseCode");

            var payment = await _context.Payments
                .Include(p => p.Order)
                .FirstOrDefaultAsync(p => p.TransactionId == transactionId);

            if (payment != null)
            {
                payment.ResponseCode = responseCode;
                payment.TransactionStatus = vnpay.GetResponseData("vnp_TransactionStatus");
                payment.BankCode = vnpay.GetResponseData("vnp_BankCode");
                payment.BankTranNo = vnpay.GetResponseData("vnp_BankTranNo");
                payment.CardType = vnpay.GetResponseData("vnp_CardType");

                if (!string.IsNullOrEmpty(vnpay.GetResponseData("vnp_PayDate")))
                {
                    payment.PayDate = DateTime.ParseExact(vnpay.GetResponseData("vnp_PayDate"), "yyyyMMddHHmmss", null);
                }

                if (responseCode == "00" && payment.TransactionStatus == "00")
                {
                    payment.Status = "Success";
                    payment.Order!.PaymentStatus = "Paid";
                    payment.Order.Status = "Paid";
                }
                else
                {
                    payment.Status = "Failed";
                    payment.Order!.PaymentStatus = "Failed";
                }

                payment.UpdatedAt = DateTime.UtcNow;
                payment.Order.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Success = responseCode == "00",
                    Message = responseCode == "00" ? "Payment successful" : "Payment failed",
                    TransactionId = transactionId,
                    OrderId = payment.OrderId,
                    Amount = payment.Amount
                });
            }
        }

        return BadRequest("Invalid payment response");
    }

    // GET: api/orders/payment/{transactionId}/status
    [HttpGet("payment/{transactionId}/status")]
    [Authorize]
    public async Task<IActionResult> GetPaymentStatus(string transactionId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var payment = await _context.Payments
            .Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.TransactionId == transactionId && p.Order!.UserId == userId);

        if (payment == null)
        {
            return NotFound("Payment not found");
        }

        return Ok(new
        {
            payment.TransactionId,
            payment.Status,
            payment.Amount,
            payment.ResponseCode,
            payment.TransactionStatus,
            payment.BankCode,
            payment.BankTranNo,
            payment.CardType,
            payment.PayDate,
            payment.CreatedAt,
            payment.UpdatedAt,
            Order = new
            {
                payment.Order!.Id,
                payment.Order.Status,
                payment.Order.PaymentStatus
            }
        });
    }

    private string GetClientIpAddress(Microsoft.AspNetCore.Http.HttpContext context)
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

public class CreateOrderModel
{
    public List<OrderItemModel> Items { get; set; } = new();
}

public class OrderItemModel
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}

public class CreatePaymentRequest
{
    public string? BankCode { get; set; }
    public string? Language { get; set; } = "vn";
    public string? BillingFullName { get; set; }
    public string? BillingEmail { get; set; }
    public string? BillingMobile { get; set; }
    public string? BillingAddress { get; set; }
    public string? BillingCity { get; set; }
    public string? BillingCountry { get; set; } = "VN";
}