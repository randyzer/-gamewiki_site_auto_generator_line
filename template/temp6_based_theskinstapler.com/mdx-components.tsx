import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import type { MDXComponents } from "mdx/types";
import { localePath, type Locale } from '@/lib/locales';

function ArticleTable(props: ComponentPropsWithoutRef<"table">) {
  return <div className="table-scroll" tabIndex={0}><table {...props} /></div>;
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href, ...props }) => href?.startsWith("/")
      ? <Link href={href} {...props} />
      : <a href={href} {...props} />,
    table: ArticleTable,
    ArticleTable,
    ...components,
  };
}

export function getMDXComponents(locale: Locale): MDXComponents {
  return {
    a: ({ href, ...props }) => href?.startsWith('/')
      ? <Link href={localePath(locale, href)} {...props}/>
      : <a href={href} {...props}/>,
    table: ArticleTable,
    ArticleTable,
  };
}
