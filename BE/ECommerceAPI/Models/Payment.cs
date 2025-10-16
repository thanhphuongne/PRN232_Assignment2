namespace ECommerceAPI.Models;

public class Payment
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order? Order { get; set; }
    public string TransactionId { get; set; } = string.Empty; // VNPay transaction reference
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "VND";
    public string Status { get; set; } = "Pending"; // Pending, Success, Failed, Cancelled
    public string PaymentMethod { get; set; } = "VNPay";
    public string? BankCode { get; set; }
    public string? BankTranNo { get; set; }
    public string? CardType { get; set; }
    public DateTime? PayDate { get; set; }
    public string? ResponseCode { get; set; }
    public string? TransactionStatus { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}