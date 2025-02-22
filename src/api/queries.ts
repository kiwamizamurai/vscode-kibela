import { gql } from 'graphql-request';

export const SEARCH_NOTES = gql`
  query SearchNotes(
    $query: String!,
    $coediting: Boolean,
    $isArchived: Boolean = false,
    $sortBy: SearchSortKind = RELEVANT,
    $resources: [SearchResourceKind!],
    $userIds: [ID!],
    $folderIds: [ID!]
  ) {
    search(
      query: $query,
      first: 15,
      coediting: $coediting,
      isArchived: $isArchived,
      sortBy: $sortBy,
      resources: $resources,
      userIds: $userIds,
      folderIds: $folderIds
    ) {
      edges {
        node {
          document {
            ... on Note {
              id
              title
              url
              contentUpdatedAt
              author {
                id
                account
                realName
              }
              groups {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_MY_NOTES = gql`
  query GetMyNotes {
    currentUser {
      latestNotes(first: 50) {
        totalCount
        edges {
          node {
            id
            title
            url
            contentUpdatedAt
            author {
              id
              account
              realName
            }
          }
        }
      }
    }
  }
`;

export const GET_NOTE_CONTENT = gql`
  query GetNote($id: ID!) {
    note(id: $id) {
      contentHtml
      comments(first: 5) {
        nodes {
          content
          author {
            realName
          }
        }
      }
      attachments(first: 100) {
        nodes {
          id
          name
          url
          dataUrl
          mimeType
        }
      }
    }
  }
`;

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    currentUser {
      id
    }
  }
`;

export const GET_LIKED_NOTES = gql`
  query GetLikedNotes($userId: [ID!]) {
    search(query: "", first: 15, likerIds: $userId) {
      edges {
        node {
          document {
            ... on Note {
              id
              title
              url
              contentUpdatedAt
              author {
                id
                account
                realName
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_RECENTLY_VIEWED_NOTES = gql`
  query GetRecentlyViewedNotes {
    noteBrowsingHistories(first: 15) {
      nodes {
        note {
          id
          title
          url
          contentUpdatedAt
          author {
            id
            account
            realName
          }
        }
      }
    }
  }
`;

export const GET_GROUPS = gql`
  query GetGroups {
    groups(first: 10, ability: READABLE) {
      nodes {
        id
        name
        description
        isPrivate
        canBeManaged
        canBeJoinedBySelf
        isJoined
      }
    }
  }
`;

export const GET_GROUP_FOLDERS = gql`
  query GetGroupFolders($groupId: ID!, $parentFolderId: ID) {
    group(id: $groupId) {
      folders(first: 30, active: true, parentFolderId: $parentFolderId) {
        nodes {
          id
          name
          fullName
          path
          canBeManaged
          parent {
            id
            name
          }
          notes(first: 10, active: true, orderBy: { field: CONTENT_UPDATED_AT, direction: DESC }) {
            nodes {
              id
              title
              contentUpdatedAt
              publishedAt
              author {
                account
                realName
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_NOTE = gql`
  query GetNote($noteId: ID!) {
    note(id: $noteId) {
      id
      title
      content
      contentHtml
      contentUpdatedAt
      publishedAt
      url
      path
      isLikedByCurrentUser
      attachments(first: 10) {
        nodes {
          id
          name
          dataUrl
          mimeType
        }
      }
      author {
        id
        account
        realName
      }
      groups {
        id
        name
      }
      folders(first: 100) {
        nodes {
          id
          name
          fullName
          path
        }
      }
      comments(first: 100) {
        nodes {
          id
          content
          contentHtml
          author {
            account
            realName
          }
          createdAt
        }
      }
    }
  }
`;

export const GET_GROUP_NOTES = gql`
  query($groupId: ID!) {
    group(id: $groupId) {
      notes(first: 10, active: true, onlyNotAttachedFolder: true, orderBy: { field: CONTENT_UPDATED_AT, direction: DESC }) {
        nodes {
          id
          title
          contentUpdatedAt
          publishedAt
          author {
            account
            realName
          }
        }
      }
    }
  }
`;

export const GET_FOLDER_NOTES = gql`
  query($folderId: ID!) {
    folder(id: $folderId) {
      notes(first: 10, active: true, orderBy: { field: CONTENT_UPDATED_AT, direction: DESC }) {
        nodes {
          id
          title
          contentUpdatedAt
          publishedAt
          author {
            account
            realName
          }
        }
      }
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers {
    users(first: 100) {
      nodes {
        id
        account
        realName
      }
    }
  }
`;

export const LIKE_NOTE = gql`
  mutation LikeNote($input: LikeInput!) {
    like(input: $input) {
      clientMutationId
      likers(first: 10) {
        nodes {
          id
          account
          realName
        }
      }
    }
  }
`;

export const UNLIKE_NOTE = gql`
  mutation UnlikeNote($input: UnlikeInput!) {
    unlike(input: $input) {
      clientMutationId
      likers(first: 10) {
        nodes {
          id
          account
          realName
        }
      }
    }
  }
`;
