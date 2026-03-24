-- RPC: Set permission level for shared goal
CREATE OR REPLACE FUNCTION set_goal_permission(
    p_goal_id TEXT,
    p_user_email TEXT,
    p_permission_level TEXT,
    p_performed_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    UPDATE wallet_goals_shared
    SET permission_level = p_permission_level,
        updated_at = EXTRACT(EPOCH FROM NOW()) * 1000
    WHERE goal_id = p_goal_id
    AND user_email = p_user_email;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Goal sharing not found for user %', p_user_email;
    END IF;

    -- Log the action
    INSERT INTO sharing_activity_log (
        id,
        goal_id,
        wallet_id,
        user_email,
        action,
        performed_by,
        metadata,
        timestamp,
        created_at,
        updated_at
    )
    VALUES (
        gen_random_uuid()::TEXT,
        p_goal_id,
        (SELECT wallet_id FROM saving_goals WHERE id = p_goal_id),
        p_user_email,
        'permission_changed',
        p_performed_by,
        jsonb_build_object('from', 'unknown', 'to', p_permission_level)::TEXT,
        EXTRACT(EPOCH FROM NOW()) * 1000,
        EXTRACT(EPOCH FROM NOW()) * 1000,
        EXTRACT(EPOCH FROM NOW()) * 1000
    );

    v_result := jsonb_build_object(
        'success', true,
        'message', 'Permission updated successfully'
    );

    RETURN v_result;
END;
$$;

-- RPC: Revoke goal sharing
CREATE OR REPLACE FUNCTION revoke_goal_sharing(
    p_goal_id TEXT,
    p_user_email TEXT,
    p_performed_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_id TEXT;
    v_result JSON;
BEGIN
    -- Get wallet_id before deleting
    SELECT wallet_id INTO v_wallet_id
    FROM saving_goals
    WHERE id = p_goal_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Goal not found';
    END IF;

    -- Delete sharing record
    DELETE FROM wallet_goals_shared
    WHERE goal_id = p_goal_id
    AND user_email = p_user_email;

    -- Log the action
    INSERT INTO sharing_activity_log (
        id,
        goal_id,
        wallet_id,
        user_email,
        action,
        performed_by,
        metadata,
        timestamp,
        created_at,
        updated_at
    )
    VALUES (
        gen_random_uuid()::TEXT,
        p_goal_id,
        v_wallet_id,
        p_user_email,
        'revoked',
        p_performed_by,
        NULL,
        EXTRACT(EPOCH FROM NOW()) * 1000,
        EXTRACT(EPOCH FROM NOW()) * 1000,
        EXTRACT(EPOCH FROM NOW()) * 1000
    );

    v_result := jsonb_build_object(
        'success', true,
        'message', 'Sharing revoked successfully'
    );

    RETURN v_result;
END;
$$;

-- RPC: Get goal sharing status
CREATE OR REPLACE FUNCTION get_goal_sharing_status(p_goal_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'user_email', user_email,
            'shared_by', shared_by,
            'shared_at', shared_at,
            'permission_level', permission_level
        )
    ) INTO v_result
    FROM wallet_goals_shared
    WHERE goal_id = p_goal_id;

    IF v_result IS NULL THEN
        v_result := '[]'::JSON;
    END IF;

    RETURN v_result;
END;
$$;
