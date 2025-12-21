import dayjs from "dayjs";
import { Pressable, View } from "react-native";

import { useTranslation } from "@turbostarter/i18n";
import { cn } from "@turbostarter/ui";
import { Badge } from "@turbostarter/ui-mobile/badge";
import { Skeleton } from "@turbostarter/ui-mobile/skeleton";
import { Text } from "@turbostarter/ui-mobile/text";

import type { Invitation } from "@turbostarter/auth";

export const InvitationListItem = ({
  invitation,
}: {
  invitation: Invitation;
}) => {
  const { t, i18n } = useTranslation("common");
  return (
    <Pressable className="active:bg-accent dark:active:bg-accent/50 flex-row items-center gap-3 px-4 py-3">
      <View className="flex-1">
        <Text
          className="font-sans-medium shrink text-sm leading-tight"
          numberOfLines={1}
        >
          {invitation.email}
        </Text>
        <Text
          className={cn("text-muted-foreground text-sm", {
            "text-destructive": dayjs(invitation.expiresAt).isBefore(dayjs()),
          })}
          numberOfLines={1}
        >
          {dayjs().isAfter(invitation.expiresAt) ? t("expired") : t("expires")}{" "}
          {new Date(invitation.expiresAt).toLocaleString(i18n.language, {
            hour: "2-digit",
            minute: "2-digit",
            year: "numeric",
            month: "numeric",
            day: "2-digit",
          })}
        </Text>
      </View>
      <View className="ml-auto flex-row items-center gap-1">
        <Badge variant="secondary">
          <Text>{t(invitation.status)}</Text>
        </Badge>
        <Badge variant="outline">
          <Text>{t(invitation.role)}</Text>
        </Badge>
      </View>
    </Pressable>
  );
};

export const InvitationListItemSkeleton = () => {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <View className="flex-1 gap-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-4 w-40" />
      </View>
      <View className="ml-auto flex-row items-center gap-1">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-12" />
      </View>
    </View>
  );
};
