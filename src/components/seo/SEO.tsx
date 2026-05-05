import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  publishedTime?: string;
  noindex?: boolean;
}

const SITE_NAME = "Track'm";
const SITE_URL = "https://taskflowhub.app";
const DEFAULT_DESC =
  "Track'm est un gestionnaire de tâches collaboratif avec sous-tâches, synchronisation calendrier et rappels intelligents. Organisez votre workflow en équipe.";
const DEFAULT_IMG = `${SITE_URL}/og-image.png`;

const SEO = ({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMG,
  url = SITE_URL,
  type = "website",
  publishedTime,
  noindex,
}: SEOProps) => {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Gestion de tâches collaborative`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      <link rel="canonical" href={url} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      {publishedTime && <meta property="og:updated_time" content={publishedTime} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {noindex && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  );
};

export default SEO;
