"use client";
import { useState, useEffect, useCallback } from "react";
import { signTransaction } from "@/lib/freighterClient";
import { submitSignedXdr } from "@/lib/stellarUtils";
import ConfirmDialog from "@/components/ConfirmDialog";
import { motion, useReducedMotion } from "framer-motion";
import { submitVariants } from "@/lib/animations";

interface Props {
  walletAddress: string;
  onSuccess?: (collateralId: string) => void;
}

interface FormData {
  animalType: string;
  quantity: string;
  weight: string;
  healthStatus: string;
  location: string;
  appraisedValue: string;
}

interface FormErrors {
  animalType?: string;
  quantity?: string;
  weight?: string;
  healthStatus?: string;
  location?: string;
  appraisedValue?: string;
}

const ANIMAL_TYPES = ["cattle", "goat", "sheep"];
const HEALTH_STATUSES = ["excellent", "good", "fair", "poor"];
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const AUTO_SAVE_INTERVAL = 5000; // 5 seconds
const STORAGE_KEY = "stellarkraal_collateral_form";

export default function CollateralRegistrationForm({ walletAddress, onSuccess }: Props) {
  const reduced = useReducedMotion();
  const [formData, setFormData] = useState<FormData>({
    animalType: "cattle",
    quantity: "",
    weight: "",
    healthStatus: "good",
    location: "",
    appraisedValue: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.walletAddress === walletAddress && parsed.data) {
          setShowRestorePrompt(true);
        }
      } catch (e) {
        // Invalid saved data, ignore
      }
    }
  }, [walletAddress]);

  // Auto-save form data
  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.quantity || formData.weight || formData.location || formData.appraisedValue) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            walletAddress,
            data: formData,
            timestamp: new Date().toISOString(),
          })
        );
        setLastSaved(new Date());
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [formData, walletAddress]);

  const restoreSavedData = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.data) {
          setFormData(parsed.data);
          setShowRestorePrompt(false);
        }
      } catch (e) {
        // Invalid saved data
      }
    }
  };

  const dismissRestore = () => {
    setShowRestorePrompt(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const validateField = useCallback((name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case "quantity":
        if (!value) return "Quantity is required";
        const qty = parseInt(value);
        if (isNaN(qty) || qty <= 0) return "Quantity must be a positive number";
        break;
      case "weight":
        if (!value) return "Estimated weight is required";
        const wt = parseFloat(value);
        if (isNaN(wt) || wt <= 0) return "Weight must be a positive number";
        break;
      case "location":
        if (!value || value.trim().length === 0) return "Location is required";
        if (value.trim().length < 3) return "Location must be at least 3 characters";
        break;
      case "appraisedValue":
        if (!value) return "Appraised value is required";
        const val = parseInt(value);
        if (isNaN(val) || val <= 0) return "Appraised value must be a positive number";
        break;
    }
    return undefined;
  }, []);

  const handleChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Real-time validation
    const error = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    (Object.keys(formData) as Array<keyof FormData>).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setStatus("❌ Please fix the errors before submitting");
      return;
    }

    setShowConfirm(true);
  };

  const registerCollateral = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`${API}/api/v1/collateral/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: walletAddress,
          animal_type: formData.animalType,
          count: parseInt(formData.quantity),
          appraised_value: parseInt(formData.appraisedValue),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Registration failed");
      }

      const { xdr } = await res.json();
      const { signedTxXdr } = await signTransaction(xdr, {
        network: process.env.NEXT_PUBLIC_NETWORK || "TESTNET",
      });
      const result = await submitSignedXdr(signedTxXdr);

      setStatus(`✅ Collateral registered successfully! ID: ${result}`);
      
      // Clear saved data on success
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
      
      // Reset form
      setFormData({
        animalType: "cattle",
        quantity: "",
        weight: "",
        healthStatus: "good",
        location: "",
        appraisedValue: "",
      });
      setErrors({});

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow space-y-4">
      {showRestorePrompt && (
        <div className="bg-gold/20 border border-gold rounded-lg p-4 mb-4">
          <p className="text-sm text-brown mb-2">
            You have unsaved progress. Would you like to restore it?
          </p>
          <div className="flex gap-2">
            <button
              onClick={restoreSavedData}
              className="px-4 py-1.5 bg-gold text-brown rounded-lg text-sm font-medium hover:bg-gold/80"
            >
              Restore
            </button>
            <button
              onClick={dismissRestore}
              className="px-4 py-1.5 bg-brown/10 text-brown rounded-lg text-sm hover:bg-brown/20"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold text-brown">Register Livestock Collateral</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-brown mb-1">
            Animal Type <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full border border-brown/30 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
            value={formData.animalType}
            onChange={(e) => handleChange("animalType", e.target.value)}
            disabled={loading}
          >
            {ANIMAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brown mb-1">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold ${
              errors.quantity ? "border-red-500" : "border-brown/30"
            }`}
            placeholder="Number of animals"
            value={formData.quantity}
            onChange={(e) => handleChange("quantity", e.target.value)}
            disabled={loading}
          />
          {errors.quantity && (
            <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-brown mb-1">
            Estimated Weight (kg) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.1"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold ${
              errors.weight ? "border-red-500" : "border-brown/30"
            }`}
            placeholder="Average weight per animal"
            value={formData.weight}
            onChange={(e) => handleChange("weight", e.target.value)}
            disabled={loading}
          />
          {errors.weight && (
            <p className="text-red-500 text-xs mt-1">{errors.weight}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-brown mb-1">
            Health Status <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full border border-brown/30 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
            value={formData.healthStatus}
            onChange={(e) => handleChange("healthStatus", e.target.value)}
            disabled={loading}
          >
            {HEALTH_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brown mb-1">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold ${
              errors.location ? "border-red-500" : "border-brown/30"
            }`}
            placeholder="Farm or region name"
            value={formData.location}
            onChange={(e) => handleChange("location", e.target.value)}
            disabled={loading}
          />
          {errors.location && (
            <p className="text-red-500 text-xs mt-1">{errors.location}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-brown mb-1">
            Appraised Value (stroops) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold ${
              errors.appraisedValue ? "border-red-500" : "border-brown/30"
            }`}
            placeholder="Total value in stroops"
            value={formData.appraisedValue}
            onChange={(e) => handleChange("appraisedValue", e.target.value)}
            disabled={loading}
          />
          {errors.appraisedValue && (
            <p className="text-red-500 text-xs mt-1">{errors.appraisedValue}</p>
          )}
        </div>

        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={loading || Object.keys(errors).some((key) => errors[key as keyof FormErrors])}
          variants={reduced ? undefined : submitVariants}
          animate={loading ? "loading" : "idle"}
          className="w-full bg-brown text-cream py-2.5 rounded-xl font-semibold hover:bg-brown/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Processing…" : "Register Collateral"}
        </motion.button>
      </form>

      {lastSaved && !loading && (
        <p className="text-xs text-brown/60 text-center">
          Auto-saved at {lastSaved.toLocaleTimeString()}
        </p>
      )}

      {status && (
        <div
          className={`p-3 rounded-lg text-sm ${
            status.startsWith("✅")
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {status}
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title="Register Collateral"
        message={`Register ${formData.quantity} ${formData.animalType}(s) with appraised value of ${formData.appraisedValue} stroops as on-chain collateral? This action cannot be undone.`}
        confirmLabel="Register"
        onConfirm={() => { setShowConfirm(false); registerCollateral(); }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
