import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import satori from "satori";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

// Load Berkeley Mono font from public/fonts
const fontPath = path.resolve("public/fonts/BerkeleyMonoNerdFont-Regular.woff");
const fontData = fs.readFileSync(fontPath);

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection("posts");
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title, pubDate: post.data.pubDate },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { title, pubDate } = props as { title: string; pubDate: Date };

  const formattedDate = pubDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Colors from global.css
  const colors = {
    brightSnow: "#f8f9fa",
    platinum: "#e9ecef",
    paleSlate: "#ced4da",
    slateGrey: "#6c757d",
    ironGrey: "#495057",
    gunmetal: "#343a40",
    carbonBlack: "#212529",
  };

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px",
          background: colors.carbonBlack,
          fontFamily: "Berkeley Mono",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: "24px",
                      color: colors.slateGrey,
                      textTransform: "uppercase",
                      letterSpacing: "2px",
                    },
                    children: "john mcbride",
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: "52px",
                      fontWeight: "400",
                      color: colors.brightSnow,
                      lineHeight: "1.3",
                      maxWidth: "1000px",
                    },
                    children: title,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: "24px",
                      color: colors.paleSlate,
                      marginTop: "20px",
                    },
                    children: formattedDate,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Berkeley Mono",
          data: fontData,
          weight: 400,
          style: "normal",
        },
      ],
    },
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
