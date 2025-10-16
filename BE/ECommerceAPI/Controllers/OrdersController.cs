using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using ECommerceAPI.Data;
using ECommerceAPI.Models;

namespace ECommerceAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public OrdersController(ApplicationDbContext context)
    {
        _context = context;
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
        await _context.SaveChangesAsync();

        return NoContent();
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