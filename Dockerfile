# Production Backend Dockerfile for ModelMind (Node.js + Express + Python 3 NLP + C++14 DSA Engine)
FROM node:22-bookworm-slim

# Install C++14 toolchain and Python 3 runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    make \
    python3 \
    python3-pip \
    python3-venv \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create isolated Python virtual environment and install NLP/PDF/PPTX dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHON_BIN="/opt/venv/bin/python3"

COPY python_nlp/requirements.txt ./python_nlp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir -r python_nlp/requirements.txt

# Install Node.js dependencies (include tsx runtime for `tsx server.ts`)
COPY package.json ./
RUN npm install --include=dev && npm cache clean --force

# Compile the C++14 DSA engine specifically for Linux and verify all C++ unit tests pass
COPY cxx ./cxx
RUN make -C cxx clean && make -C cxx all && make -C cxx test \
  && chmod +x cxx/bin/modelmind_engine

# Copy backend TypeScript entry point, bridges, and Python NLP modules
COPY tsconfig.json server.ts ./
COPY server ./server
COPY python_nlp ./python_nlp

# Ensure writable uploads workspace exists
RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 10000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "start"]
