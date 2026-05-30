-- ════════════════════════════════════════════════════════════════
-- Golf Tracker — Schema Migration
-- Ejecutar en Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1. Quitar owner_username de tablas globales (si existe)
ALTER TABLE clubs        DROP COLUMN IF EXISTS owner_username;
ALTER TABLE courses      DROP COLUMN IF EXISTS owner_username;
ALTER TABLE course_holes DROP COLUMN IF EXISTS owner_username;
ALTER TABLE shot_results DROP COLUMN IF EXISTS owner_username;

-- 2. Agregar owner_username a rounds
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS owner_username text NOT NULL DEFAULT 'Chechu';

-- 3. Agregar username a las tablas de juego
ALTER TABLE round_players ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE hole_scores   ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE hole_stats    ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE shots         ADD COLUMN IF NOT EXISTS username text;

-- 4. Migrar datos existentes → todos asignados a Chechu
UPDATE round_players SET username = 'Chechu' WHERE username IS NULL;
UPDATE hole_scores   SET username = 'Chechu' WHERE username IS NULL;
UPDATE hole_stats    SET username = 'Chechu' WHERE username IS NULL;
UPDATE shots         SET username = 'Chechu' WHERE username IS NULL;

-- 5. Eliminar la ronda del 28 de mayo de 2026 y todos sus registros
DO $$
DECLARE
  _ids uuid[];
BEGIN
  SELECT array_agg(id) INTO _ids FROM rounds WHERE date = '2026-05-28';
  IF _ids IS NOT NULL THEN
    DELETE FROM shots         WHERE round_id = ANY(_ids);
    DELETE FROM hole_stats    WHERE round_id = ANY(_ids);
    DELETE FROM hole_scores   WHERE round_id = ANY(_ids);
    DELETE FROM round_players WHERE round_id = ANY(_ids);
    DELETE FROM rounds        WHERE id = ANY(_ids);
  END IF;
END $$;

-- 6. Hacer username NOT NULL
ALTER TABLE round_players ALTER COLUMN username SET NOT NULL;
ALTER TABLE hole_scores   ALTER COLUMN username SET NOT NULL;
ALTER TABLE hole_stats    ALTER COLUMN username SET NOT NULL;
ALTER TABLE shots         ALTER COLUMN username SET NOT NULL;

-- 7. Eliminar columnas player_id (ya no se usan)
ALTER TABLE round_players DROP COLUMN IF EXISTS player_id;
ALTER TABLE hole_scores   DROP COLUMN IF EXISTS player_id;
ALTER TABLE hole_stats    DROP COLUMN IF EXISTS player_id;
ALTER TABLE shots         DROP COLUMN IF EXISTS player_id;

-- 8. Constraints únicos para upserts
ALTER TABLE hole_scores DROP CONSTRAINT IF EXISTS hole_scores_round_id_player_id_hole_number_key;
ALTER TABLE hole_stats  DROP CONSTRAINT IF EXISTS hole_stats_round_id_player_id_hole_number_key;

ALTER TABLE hole_scores ADD CONSTRAINT hole_scores_round_username_hole_key
  UNIQUE (round_id, username, hole_number);
ALTER TABLE hole_stats ADD CONSTRAINT hole_stats_round_username_hole_key
  UNIQUE (round_id, username, hole_number);

-- 9. Eliminar tabla players
DROP TABLE IF EXISTS players CASCADE;

SELECT 'Migration completada' AS status;
