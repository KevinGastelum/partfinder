-- RPC Functions for Admin Dashboard Aggregates
-- These run on the FULL dataset to populate filter dropdowns

-- 1. Get vehicle (make) counts
CREATE OR REPLACE FUNCTION get_vehicle_counts()
RETURNS TABLE(name TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT make AS name, COUNT(*)::BIGINT as count
  FROM listings
  WHERE make IS NOT NULL
  GROUP BY make
  ORDER BY count DESC
  LIMIT 30;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get part counts
CREATE OR REPLACE FUNCTION get_part_counts()
RETURNS TABLE(name TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT part_name AS name, COUNT(*)::BIGINT as count
  FROM listings
  WHERE part_name IS NOT NULL
  GROUP BY part_name
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get year counts
CREATE OR REPLACE FUNCTION get_year_counts()
RETURNS TABLE(name TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT year::TEXT AS name, COUNT(*)::BIGINT as count
  FROM listings
  WHERE year IS NOT NULL
  GROUP BY year
  ORDER BY year ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Get total inventory count (for dashboard header)
CREATE OR REPLACE FUNCTION get_total_count()
RETURNS BIGINT AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM listings);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
