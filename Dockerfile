FROM jarredsumner/bun:edge

WORKDIR /app

COPY package.json bun.lockb ./

CMD ["bun", "install"]
# skip installing devDependencies in production
# RUN bun install --production

# copy app source
COPY . .

EXPOSE 5000

# run entrypoint file with bun
ENTRYPOINT ["bun", "example.ts"]
