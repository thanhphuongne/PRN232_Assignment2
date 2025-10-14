using Microsoft.AspNetCore.Identity;

namespace ECommerceAPI.Models;

public class ApplicationUser : IdentityUser
{
    // Add additional properties if needed
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}