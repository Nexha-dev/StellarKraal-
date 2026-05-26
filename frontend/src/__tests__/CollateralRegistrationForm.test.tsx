import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CollateralRegistrationForm from "@/components/CollateralRegistrationForm";

// Mock dependencies
jest.mock("@stellar/freighter-api", () => ({
  signTransaction: jest.fn().mockResolvedValue({ signedTxXdr: "signed_xdr" }),
}));

jest.mock("@/lib/stellarUtils", () => ({
  submitSignedXdr: jest.fn().mockResolvedValue("collateral_123"),
}));

global.fetch = jest.fn();

describe("CollateralRegistrationForm", () => {
  const mockWalletAddress = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ xdr: "mock_xdr", api_version: "v1" }),
    });
  });

  it("renders all form fields", () => {
    render(<CollateralRegistrationForm walletAddress={mockWalletAddress} />);

    expect(screen.getByText("Register Livestock Collateral")).toBeInTheDocument();
    expect(screen.getByLabelText(/Animal Type/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estimated Weight/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Health Status/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Location/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Appraised Value/)).toBeInTheDocument();
  });

  it("shows validation errors for empty required fields", async () => {
    render(<CollateralRegistrationForm walletAddress={mockWalletAddress} />);

    const submitButton = screen.getByRole("button", { name: /Register Collateral/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Quantity is required")).toBeInTheDocument();
      expect(screen.getByText("Estimated weight is required")).toBeInTheDocument();
      expect(screen.getByText("Location is required")).toBeInTheDocument();
      expect(screen.getByText("Appraised value is required")).toBeInTheDocument();
    });
  });

  it("shows real-time validation for quantity field", async () => {
    render(<CollateralRegistrationForm walletAddress={mockWalletAddress} />);

    const quantityInput = screen.getByPlaceholderText("Number of animals");
    
    fireEvent.change(quantityInput, { target: { value: "-5" } });
    await waitFor(() => {
      expect(screen.getByText("Quantity must be a positive number")).toBeInTheDocument();
    });

    fireEvent.change(quantityInput, { target: { value: "10" } });
    await waitFor(() => {
      expect(screen.queryByText("Quantity must be a positive number")).not.toBeInTheDocument();
    });
  });

  it("shows real-time validation for location field", async () => {
    render(<CollateralRegistrationForm walletAddress={mockWalletAddress} />);

    const locationInput = screen.getByPlaceholderText("Farm or region name");
    
    fireEvent.change(locationInput, { target: { value: "ab" } });
    await waitFor(() => {
      expect(screen.getByText("Location must be at least 3 characters")).toBeInTheDocument();
    });

    fireEvent.change(locationInput, { target: { value: "Farm ABC" } });
    await waitFor(() => {
      expect(screen.queryByText("Location must be at least 3 characters")).not.toBeInTheDocument();
    });
  });

  it("disables submit button when there are validation errors", async () => {
    render(<CollateralRegistrationForm walletAddress={mockWalletAddress} />);

    const quantityInput = screen.getByPlaceholderText("Number of animals");
    fireEvent.change(quantityInput, { target: { value: "-5" } });

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /Register Collateral/ });
      expect(submitButton).toBeDisabled();
    });
  });

  it("submits form with valid data", async () => {
    render(<CollateralRegistrationForm walletAddress={mockWalletAddress} onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByPlaceholderText("Number of animals"), { target: { value: "5" } });
    fireEvent.change(screen.getByPlaceholderText("Average weight per animal"), { target: { value: "450" } });
    fireEvent.change(screen.getByPlaceholderText("Farm or region name"), { target: { value: "Green Valley Farm" } });
    fireEvent.change(screen.getByPlaceholderText("Total value in stroops"), { target: { value: "1000000" } });

    const submitButton = screen.getByRole("button", { name: /Register Collateral/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/collateral/register"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("cattle"),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Collateral registered successfully/)).toBeInTheDocument();
      expect(mockOnSuccess).toHaveBeenCalledWith("collateral_123");
    });
  });

  it("displays error toast on submission failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Registration failed" }),
    });

    render(<CollateralRegistrationForm walletAddress={mockWalletAddress} />);

    fireEvent.change(screen.getByPlaceholderText("Number of animals"), { target: { value: "5" } });
    fireEvent.change(screen.getByPlaceholderText("Average weight per animal"), { target: { value: "450" } });
    fireEvent.change(screen.getByPlaceholderText("Farm or region name"), { target: { value: "Green Valley Farm" } });
    fireEvent.change(screen.getByPlaceholderText("Total value in stroops"), { target: { value: "1000000" } });

    const submitButton = screen.getByRole("button", { name: /Register Collateral/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Registration failed/)).toBeInTheDocument();
    });
  });

  it("disables form during submission", async () => {
    render(<CollateralRegistrationForm walletAddress={mockWalletAddress} />);

    fireEvent.change(screen.getByPlaceholderText("Number of animals"), { target: { value: "5" } });
    fireEvent.change(screen.getByPlaceholderText("Average weight per animal"), { target: { value: "450" } });
    fireEvent.change(screen.getByPlaceholderText("Farm or region name"), { target: { value: "Green Valley Farm" } });
    fireEvent.change(screen.getByPlaceholderText("Total value in stroops"), { target: { value: "1000000" } });

    const submitButton = screen.getByRole("button", { name: /Register Collateral/ });
    fireEvent.click(submitButton);

    expect(screen.getByRole("button", { name: /Processing/ })).toBeDisabled();
  });

  it("resets form after successful submission", async () => {
    render(<CollateralRegistrationForm walletAddress={mockWalletAddress} />);

    const quantityInput = screen.getByPlaceholderText("Number of animals") as HTMLInputElement;
    fireEvent.change(quantityInput, { target: { value: "5" } });
    fireEvent.change(screen.getByPlaceholderText("Average weight per animal"), { target: { value: "450" } });
    fireEvent.change(screen.getByPlaceholderText("Farm or region name"), { target: { value: "Green Valley Farm" } });
    fireEvent.change(screen.getByPlaceholderText("Total value in stroops"), { target: { value: "1000000" } });

    const submitButton = screen.getByRole("button", { name: /Register Collateral/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(quantityInput.value).toBe("");
    });
  });

  describe("Auto-save functionality", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("auto-saves form data every 5 seconds", () => {
      render(<CollateralRegistrationForm walletAddress={mockWalletAddress} />);

      fireEvent.change(screen.getByPlaceholderText("Number of animals"), { target: { value: "5" } });
      fireEvent.change(screen.getByPlaceholderText("Farm or region name"), { target: { value: "Test Farm" } });

      jest.advanceTimersByTime(5000);

      const saved = localStorage.getItem("stellarkraal_collateral_form");
      expect(saved).toBeTruthy();
      const parsed = JSON.parse(saved!);
      expect(parsed.data.quantity).toBe("5");
      expect(parsed.data.location).toBe("Test Farm");
    });

    it("shows restore prompt when saved data exists", () => {
      localStorage.setItem(
        "stellarkraal_collateral_form",
        JSON.stringify({
          walletAddress: mockWalletAddress,
          data: { quantity: "10", location: "Saved Farm" },
          timestamp: new Date().toISOString(),
        })
      );

      render(<CollateralRegistrationForm walletAddress={mockWalletAddress} />);

      expect(screen.getByText(/You have unsaved progress/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Restore/ })).toBeInTheDocument();
    });

    it("restores saved data when user clicks restore", () => {
      localStorage.setItem(
        "stellarkraal_collateral_form",
        JSON.stringify({
          walletAddress: mockWalletAddress,
          data: { 
            animalType: "goat",
            quantity: "10", 
            weight: "50",
            healthStatus: "excellent",
            location: "Saved Farm",
            appraisedValue: "500000"
          },
          timestamp: new Date().toISOString(),
        })
      );

      render(<CollateralRegistrationForm walletAddress={mockWalletAddress} />);

      const restoreButton = screen.getByRole("button", { name: /Restore/ });
      fireEvent.click(restoreButton);

      expect((screen.getByPlaceholderText("Number of animals") as HTMLInputElement).value).toBe("10");
      expect((screen.getByPlaceholderText("Farm or region name") as HTMLInputElement).value).toBe("Saved Farm");
    });

    it("clears saved data on successful submission", async () => {
      localStorage.setItem(
        "stellarkraal_collateral_form",
        JSON.stringify({
          walletAddress: mockWalletAddress,
          data: { quantity: "5" },
          timestamp: new Date().toISOString(),
        })
      );

      render(<CollateralRegistrationForm walletAddress={mockWalletAddress} />);

      fireEvent.change(screen.getByPlaceholderText("Number of animals"), { target: { value: "5" } });
      fireEvent.change(screen.getByPlaceholderText("Average weight per animal"), { target: { value: "450" } });
      fireEvent.change(screen.getByPlaceholderText("Farm or region name"), { target: { value: "Test Farm" } });
      fireEvent.change(screen.getByPlaceholderText("Total value in stroops"), { target: { value: "1000000" } });

      const submitButton = screen.getByRole("button", { name: /Register Collateral/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem("stellarkraal_collateral_form")).toBeNull();
      });
    });
  });
});
