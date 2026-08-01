import { useState, type FormEvent } from "react";
import { Plus, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonitorFormProps {
  onCreate: (input: { name: string; url: string }) => Promise<void>;
}

interface FormErrors {
  name?: string;
  url?: string;
}

const isValidUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const MonitorForm = ({ onCreate }: MonitorFormProps) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();

    if (!trimmedName) {
      next.name = "Name is required.";
    } else if (trimmedName.length > 80) {
      next.name = "Name must be 80 characters or fewer.";
    }

    if (!trimmedUrl) {
      next.url = "URL is required.";
    } else if (!isValidUrl(trimmedUrl)) {
      next.url = "Enter a valid http or https URL.";
    }

    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    const found = validate();
    setErrors(found);
    if (found.name || found.url) return;

    setSubmitting(true);
    try {
      await onCreate({ name: name.trim(), url: url.trim() });
      setName("");
      setUrl("");
      setErrors({});
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create monitor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      <h2 className="text-base font-semibold">Create monitor</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add an endpoint to track. It is saved to the backend and starts with an
        Unknown status until you run a check.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="monitor-name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="monitor-name"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My API"
            maxLength={80}
            disabled={submitting}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "monitor-name-error" : undefined}
            className={cn(
              "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60",
              errors.name && "border-destructive focus:ring-destructive",
            )}
          />
          {errors.name && (
            <p
              id="monitor-name-error"
              className="flex items-center gap-1 text-xs text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="monitor-url" className="text-sm font-medium">
            URL
          </label>
          <input
            id="monitor-url"
            name="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/health"
            disabled={submitting}
            aria-invalid={!!errors.url}
            aria-describedby={errors.url ? "monitor-url-error" : undefined}
            className={cn(
              "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60",
              errors.url && "border-destructive focus:ring-destructive",
            )}
          />
          {errors.url && (
            <p
              id="monitor-url-error"
              className="flex items-center gap-1 text-xs text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {errors.url}
            </p>
          )}
        </div>
      </div>

      {submitError && (
        <p className="mt-3 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {submitError}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add monitor
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default MonitorForm;