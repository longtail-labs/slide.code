import { useMutation } from '@tanstack/react-query'
import { useRpc } from '../../rpc/provider.js'

// Hook to open external links in the user's default browser
export const useOpenExternalLink = () => {
  const { runRpcProgram } = useRpc()

  return useMutation<boolean, Error, string>({
    mutationFn: async (url: string) => {
      console.log('[EXTERNAL-HELPERS] 🔗 Opening external link:', url)
      const success = await runRpcProgram((client) => {
        return client.OpenExternalLink({ url })
      })
      console.log('[EXTERNAL-HELPERS] 🔗 External link opened:', success)
      return success
    },
    onError: (error) => {
      console.error('[EXTERNAL-HELPERS] ❌ Error opening external link:', error)
    }
  })
}

// Convenience function to open GitHub links
export const useOpenGitHubLink = () => {
  const { mutate: openLink, ...rest } = useOpenExternalLink()

  return {
    openRepository: (owner: string, repo: string) => {
      openLink(`https://github.com/${owner}/${repo}`)
    },
    openIssues: (owner: string, repo: string) => {
      openLink(`https://github.com/${owner}/${repo}/issues`)
    },
    openPullRequests: (owner: string, repo: string) => {
      openLink(`https://github.com/${owner}/${repo}/pulls`)
    },
    openProfile: (username: string) => {
      openLink(`https://github.com/${username}`)
    },
    openGist: (gistId: string) => {
      openLink(`https://gist.github.com/${gistId}`)
    },
    ...rest
  }
}

// Convenience function to open Discord links
export const useOpenDiscordLink = () => {
  const { mutate: openLink, ...rest } = useOpenExternalLink()

  return {
    openInvite: (inviteCode: string) => {
      openLink(`https://discord.gg/${inviteCode}`)
    },
    openChannel: (guildId: string, channelId: string) => {
      openLink(`https://discord.com/channels/${guildId}/${channelId}`)
    },
    openUser: (userId: string) => {
      openLink(`https://discord.com/users/${userId}`)
    },
    openApp: () => {
      openLink('https://discord.com/app')
    },
    ...rest
  }
}

// Convenience function to open documentation links
export const useOpenDocumentationLink = () => {
  const { mutate: openLink, ...rest } = useOpenExternalLink()

  return {
    openNpmPackage: (packageName: string) => {
      openLink(`https://www.npmjs.com/package/${packageName}`)
    },
    openMdnDocs: (path: string) => {
      openLink(`https://developer.mozilla.org/en-US/docs/${path}`)
    },
    openReactDocs: (path: string = '') => {
      openLink(`https://react.dev/${path}`)
    },
    openEffectDocs: (path: string = '') => {
      openLink(`https://effect.website/${path}`)
    },
    openElectronDocs: (path: string = '') => {
      openLink(`https://electronjs.org/docs/${path}`)
    },
    ...rest
  }
}

// Simple wrapper function for direct usage
export const openExternalLink = (url: string) => {
  const { mutate } = useOpenExternalLink()
  return mutate(url)
}
