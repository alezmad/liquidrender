import { Pressable, View } from "react-native";

import { useTranslation } from "@turbostarter/i18n";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@turbostarter/ui-mobile/avatar";
import { Badge } from "@turbostarter/ui-mobile/badge";
import { Icons } from "@turbostarter/ui-mobile/icons";
import { Skeleton } from "@turbostarter/ui-mobile/skeleton";
import { Text } from "@turbostarter/ui-mobile/text";

import { authClient } from "~/lib/auth";

import type { Member } from "@turbostarter/auth";

export const MembersListItem = ({ member }: { member: Member }) => {
  const { t } = useTranslation("common");
  const session = authClient.useSession();

  return (
    <Pressable className="active:bg-accent dark:active:bg-accent/50 flex-row items-center gap-3 px-4 py-3">
      <Avatar alt={member.user.name}>
        <AvatarImage source={{ uri: member.user.image }} />
        <AvatarFallback>
          <Icons.UserRound size={20} className="text-foreground" />
        </AvatarFallback>
      </Avatar>
      <View className="flex-1">
        <View className="flex-1 flex-row items-center gap-2">
          <Text
            className="font-sans-medium shrink text-sm leading-tight"
            numberOfLines={1}
          >
            {member.user.name}
          </Text>
          {member.userId === session.data?.user.id && (
            <Badge variant="outline">
              <Text>{t("you")}</Text>
            </Badge>
          )}
        </View>
        <Text className="text-muted-foreground text-sm" numberOfLines={1}>
          {member.user.email}
        </Text>
      </View>

      <Badge variant="outline" className="ml-auto">
        <Text>{t(member.role)}</Text>
      </Badge>
    </Pressable>
  );
};

export const MembersListItemSkeleton = () => {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Skeleton className="size-10 rounded-full" />
      <View className="flex-1 gap-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full max-w-64" />
      </View>
      <Skeleton className="ml-auto h-5 w-12" />
    </View>
  );
};
