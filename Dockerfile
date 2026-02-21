FROM denoland/deno:2.3.3

WORKDIR /app

# Copy the entire project or just what's needed
# For now, we copy everything to be safe as imports might traverse
COPY . .

# Compile/Cache dependencies (Optional but good for startup speed)
# We can just cache the sync file
RUN deno cache supabase/functions/sync-aleph/index.ts

# The user wants this to be deployed on Coolify.
# Coolify usually exposes a port. The Deno.serve listens on port 8000 by default.
EXPOSE 8000

# Command to run the sync function
# running with --allow-all for simplicity, but in prod should be scoped
CMD ["run", "--allow-all", "supabase/functions/sync-aleph/index.ts"]
