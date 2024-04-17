import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContextProvider';
import { z } from 'zod';
import isTokenExpired from '../lib/isTokenExpired';
import { TWorkspace } from '../types/workspace.type';

const formSchema = z.object({
  workspace: z.string().min(1, 'Workspace is required').trim()
});

type formType = z.infer<typeof formSchema>;

type useMutationWorkspaceUpdateProps = {
  selectedWorkspace: TWorkspace | undefined;
};

const useMutationWorkspaceUpdate = ({
  selectedWorkspace
}: useMutationWorkspaceUpdateProps) => {
  const queryClient = useQueryClient();
  const { accessToken, refreshToken, setToken, clearToken } =
    useAuth();

  const mutation = useMutation({
    mutationFn: async (data: formType) => {
      let accesT = accessToken;
      let refreshT = refreshToken;

      if (!accessToken) {
        throw new Error('Access token not found');
      }

      if (isTokenExpired(accesT, refreshT)) {
        // Request to refresh token using refreshToken API endpoint
        const response = await fetch(
          `${import.meta.env.VITE_API_JWT_REFRESH}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + refreshT
            }
          }
        );

        if (response.ok) {
          const { access_token, refresh_token } =
            await response.json();
          accesT = access_token;
          refreshT = refresh_token;
          setToken(access_token, refresh_token);
        } else {
          clearToken();
          // If refresh token is also expired or invalid, redirect to login
          throw new Error('Refresh token failed');
        }
      }

      const responseData = await submitHandler(data, accesT);

      return responseData;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    }
  });

  const submitHandler = async (
    data: formType,
    token: string | null
  ) => {
    const response = await fetch(
      `${import.meta.env.VITE_API_WORKSPACES}/${selectedWorkspace?.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          title: data.workspace
        })
      }
    );

    const body = await response.json();

    return body;
  };

  return {
    ...mutation
  };
};

export default useMutationWorkspaceUpdate;
